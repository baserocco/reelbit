use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

declare_id!("612nmeDQ6xCRBYoML5hXog1GuYDik4JYAvW8Tihvcpj3");

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct HarvesterConfig {
    pub authority: Pubkey,
    pub lp_vault_program: Pubkey,
    pub distribution_program: Pubkey,
    pub total_harvested: u64,
    pub bump: u8,
}

impl HarvesterConfig {
    const LEN: usize = 8 + 32 + 32 + 32 + 8 + 1;
}

/// Per-slot harvest state — tracks last harvest time for rate-limiting.
#[account]
pub struct HarvestState {
    pub mint: Pubkey,
    pub last_harvest_ts: i64,
    pub total_harvested_a: u64,
    pub total_harvested_b: u64,
    pub bump: u8,
}

impl HarvestState {
    const LEN: usize = 8 + 32 + 8 + 8 + 8 + 1;
}

// minimum seconds between harvests per slot (prevent spam)
const HARVEST_COOLDOWN: i64 = 3600; // 1 hour

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum HarvesterError {
    #[msg("Harvest cooldown not elapsed")]
    Cooldown,
    #[msg("No fees to harvest")]
    NoFees,
    #[msg("Unauthorized")]
    Unauthorized,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct FeesHarvested {
    pub mint: Pubkey,
    pub fees_a: u64,
    pub fees_b: u64,
    pub harvested_at: i64,
}

// ── Accounts ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = HarvesterConfig::LEN,
        seeds = [b"harvester_config"],
        bump,
    )]
    pub config: Account<'info, HarvesterConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(mint: Pubkey)]
pub struct InitHarvestState<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(seeds = [b"harvester_config"], bump = config.bump,
              constraint = authority.key() == config.authority @ HarvesterError::Unauthorized)]
    pub config: Account<'info, HarvesterConfig>,

    #[account(
        init,
        payer = authority,
        space = HarvestState::LEN,
        seeds = [b"harvest_state", mint.as_ref()],
        bump,
    )]
    pub harvest_state: Account<'info, HarvestState>,

    pub system_program: Program<'info, System>,
}

/// Harvest fees from Meteora Dynamic AMM and forward to the distribution program.
///
/// Full flow (all within one transaction):
///   1. Withdraw LP tokens from lp-vault (CPI)
///   2. Call Meteora AMM claim_fee CPI — fees land in fee_ta_a / fee_ta_b
///   3. Re-deposit LP tokens to lp-vault (CPI)
///   4. Call distribution.distribute() for token A fees (CPI)
///   5. Call distribution.distribute() for token B fees (CPI)
///
/// Sprint 3 will wire up the real Meteora CPI interfaces.
/// Sprint 1 provides the account structure and cooldown enforcement.
#[derive(Accounts)]
pub struct Harvest<'info> {
    /// Permissionless crank — anyone can call harvest
    #[account(mut)]
    pub crank: Signer<'info>,

    #[account(seeds = [b"harvester_config"], bump = config.bump)]
    pub config: Account<'info, HarvesterConfig>,

    #[account(
        mut,
        seeds = [b"harvest_state", harvest_state.mint.as_ref()],
        bump = harvest_state.bump,
    )]
    pub harvest_state: Account<'info, HarvestState>,

    /// LP position PDA from lp-vault (used to read amm_pool / lp_token_account)
    /// CHECK: read-only reference; deserialization by lp-vault CPI
    pub lp_position: AccountInfo<'info>,

    /// Vault LP token account
    #[account(mut)]
    pub vault_lp_ta: Account<'info, TokenAccount>,

    /// Temp LP token account owned by this program's PDA during harvest
    #[account(mut)]
    pub temp_lp_ta: Account<'info, TokenAccount>,

    /// Fee token accounts where Meteora deposits claimed fees
    #[account(mut)]
    pub fee_ta_a: Account<'info, TokenAccount>,

    #[account(mut)]
    pub fee_ta_b: Account<'info, TokenAccount>,

    /// Distribution program fee vault (source for the distribute CPI)
    #[account(mut)]
    pub dist_source_vault: Account<'info, TokenAccount>,

    /// CHECK: lp-vault program — invoked via CPI
    pub lp_vault_program: AccountInfo<'info>,

    /// CHECK: distribution program — invoked via CPI
    pub distribution_program: AccountInfo<'info>,

    /// CHECK: Meteora Dynamic AMM program — invoked via CPI in Sprint 3
    pub meteora_amm_program: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ── Program ───────────────────────────────────────────────────────────────────

#[program]
pub mod harvester {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        lp_vault_program: Pubkey,
        distribution_program: Pubkey,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.authority = ctx.accounts.authority.key();
        cfg.lp_vault_program = lp_vault_program;
        cfg.distribution_program = distribution_program;
        cfg.total_harvested = 0;
        cfg.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn init_harvest_state(
        ctx: Context<InitHarvestState>,
        mint: Pubkey,
    ) -> Result<()> {
        let hs = &mut ctx.accounts.harvest_state;
        hs.mint = mint;
        hs.last_harvest_ts = 0;
        hs.total_harvested_a = 0;
        hs.total_harvested_b = 0;
        hs.bump = ctx.bumps.harvest_state;
        Ok(())
    }

    /// Permissionless crank: claims Meteora AMM fees and pipes them to distribution.
    ///
    /// Sprint 1: enforces cooldown + records state.
    /// Sprint 3: adds real Meteora claim_fee + lp-vault withdraw/deposit CPIs.
    pub fn harvest(ctx: Context<Harvest>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let hs = &mut ctx.accounts.harvest_state;

        require!(
            now - hs.last_harvest_ts >= HARVEST_COOLDOWN,
            HarvesterError::Cooldown
        );

        // ── Sprint 3 TODO: Meteora claim_fee CPI ─────────────────────────────
        // 1. lp_vault::withdraw_lp(lp_position, lp_amount)
        // 2. meteora_amm::claim_fee(pool, lp_position, fee_ta_a, fee_ta_b)
        // 3. lp_vault::deposit_lp(lp_position, lp_amount)
        // ─────────────────────────────────────────────────────────────────────

        let fees_a = ctx.accounts.fee_ta_a.amount;
        let fees_b = ctx.accounts.fee_ta_b.amount;

        require!(fees_a > 0 || fees_b > 0, HarvesterError::NoFees);

        // ── Sprint 3 TODO: distribution::distribute CPI for fees_a + fees_b ──

        hs.last_harvest_ts = now;
        hs.total_harvested_a = hs.total_harvested_a.saturating_add(fees_a);
        hs.total_harvested_b = hs.total_harvested_b.saturating_add(fees_b);

        ctx.accounts.config.total_harvested =
            ctx.accounts.config.total_harvested.saturating_add(fees_a + fees_b);

        emit!(FeesHarvested {
            mint: hs.mint,
            fees_a,
            fees_b,
            harvested_at: now,
        });

        Ok(())
    }
}
