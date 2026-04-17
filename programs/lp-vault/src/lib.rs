use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("5Vobh8rxWv4eMKUme9Y15C3ta3vh6y1G7MW6N87SejwL");

// ── State ─────────────────────────────────────────────────────────────────────

/// Global config — set once at program init.
#[account]
pub struct VaultConfig {
    /// Platform multisig / upgrade authority
    pub authority: Pubkey,
    /// The harvester program is the only caller allowed to withdraw LP tokens
    pub harvester: Pubkey,
    pub bump: u8,
}

impl VaultConfig {
    const LEN: usize = 8 + 32 + 32 + 1;
}

/// One per graduated slot — tracks the LP token position held on behalf of the protocol.
#[account]
pub struct LpPosition {
    pub mint: Pubkey,
    pub creator: Pubkey,
    /// The Dynamic AMM pool this LP token belongs to
    pub amm_pool: Pubkey,
    /// SPL token account (owned by this PDA) holding the LP tokens
    pub lp_token_account: Pubkey,
    /// Lamport amount of accumulated SOL fees claimable (updated by harvester)
    pub pending_fees_a: u64,
    pub pending_fees_b: u64,
    pub deposited_at: i64,
    pub bump: u8,
}

impl LpPosition {
    const LEN: usize = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 1;
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum VaultError {
    #[msg("Only the harvester program may withdraw LP tokens")]
    NotHarvester,
    #[msg("Only platform authority")]
    Unauthorized,
    #[msg("LP position already registered for this mint")]
    AlreadyRegistered,
    #[msg("Zero amount")]
    ZeroAmount,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct LpDeposited {
    pub mint: Pubkey,
    pub amm_pool: Pubkey,
    pub amount: u64,
    pub deposited_at: i64,
}

#[event]
pub struct LpWithdrawn {
    pub mint: Pubkey,
    pub amount: u64,
    pub to: Pubkey,
}

// ── Accounts ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = VaultConfig::LEN,
        seeds = [b"vault_config"],
        bump,
    )]
    pub config: Account<'info, VaultConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(mint: Pubkey)]
pub struct RegisterPosition<'info> {
    /// Migration bot or graduation-detector CPI — must be authority
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(seeds = [b"vault_config"], bump = config.bump,
              constraint = authority.key() == config.authority @ VaultError::Unauthorized)]
    pub config: Account<'info, VaultConfig>,

    #[account(
        init,
        payer = authority,
        space = LpPosition::LEN,
        seeds = [b"lp_position", mint.as_ref()],
        bump,
    )]
    pub lp_position: Account<'info, LpPosition>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositLp<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(seeds = [b"vault_config"], bump = config.bump)]
    pub config: Account<'info, VaultConfig>,

    #[account(
        mut,
        seeds = [b"lp_position", lp_position.mint.as_ref()],
        bump = lp_position.bump,
    )]
    pub lp_position: Account<'info, LpPosition>,

    /// Source: depositor's LP token account
    #[account(mut)]
    pub depositor_lp_ta: Account<'info, TokenAccount>,

    /// Destination: vault's LP token account (owned by lp_position PDA)
    #[account(mut, address = lp_position.lp_token_account)]
    pub vault_lp_ta: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawLp<'info> {
    /// Must be the harvester program's signer PDA
    pub harvester_authority: Signer<'info>,

    #[account(seeds = [b"vault_config"], bump = config.bump,
              constraint = harvester_authority.key() == config.harvester @ VaultError::NotHarvester)]
    pub config: Account<'info, VaultConfig>,

    #[account(
        mut,
        seeds = [b"lp_position", lp_position.mint.as_ref()],
        bump = lp_position.bump,
    )]
    pub lp_position: Account<'info, LpPosition>,

    #[account(mut, address = lp_position.lp_token_account)]
    pub vault_lp_ta: Account<'info, TokenAccount>,

    /// Destination controlled by the harvester (e.g. a temp account for AMM CPI)
    #[account(mut)]
    pub dest_lp_ta: Account<'info, TokenAccount>,

    /// PDA that owns vault_lp_ta — seeds: [b"lp_ta_auth", mint]
    /// CHECK: used as token account authority; verified by token CPI
    #[account(seeds = [b"lp_ta_auth", lp_position.mint.as_ref()], bump)]
    pub lp_ta_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

// ── Program ───────────────────────────────────────────────────────────────────

#[program]
pub mod lp_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, harvester: Pubkey) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.authority = ctx.accounts.authority.key();
        cfg.harvester = harvester;
        cfg.bump = ctx.bumps.config;
        Ok(())
    }

    /// Registers an LP position entry before the LP tokens are deposited.
    /// Called by the migration bot immediately after pool creation.
    pub fn register_position(
        ctx: Context<RegisterPosition>,
        mint: Pubkey,
        amm_pool: Pubkey,
        creator: Pubkey,
        lp_token_account: Pubkey,
    ) -> Result<()> {
        let pos = &mut ctx.accounts.lp_position;
        pos.mint = mint;
        pos.creator = creator;
        pos.amm_pool = amm_pool;
        pos.lp_token_account = lp_token_account;
        pos.pending_fees_a = 0;
        pos.pending_fees_b = 0;
        pos.deposited_at = Clock::get()?.unix_timestamp;
        pos.bump = ctx.bumps.lp_position;
        Ok(())
    }

    /// Migration bot deposits LP tokens into the vault after pool creation.
    pub fn deposit_lp(ctx: Context<DepositLp>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.depositor_lp_ta.to_account_info(),
                    to: ctx.accounts.vault_lp_ta.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                },
            ),
            amount,
        )?;

        emit!(LpDeposited {
            mint: ctx.accounts.lp_position.mint,
            amm_pool: ctx.accounts.lp_position.amm_pool,
            amount,
            deposited_at: ctx.accounts.lp_position.deposited_at,
        });

        Ok(())
    }

    /// Harvester withdraws LP tokens temporarily to claim fees from the AMM,
    /// then must re-deposit via deposit_lp in the same transaction.
    pub fn withdraw_lp(ctx: Context<WithdrawLp>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);

        let mint = ctx.accounts.lp_position.mint;
        let bump = ctx.bumps.lp_ta_authority;
        let seeds: &[&[u8]] = &[b"lp_ta_auth", mint.as_ref(), &[bump]];
        let signer: &[&[&[u8]]] = &[&[seeds[0], seeds[1], seeds[2]]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault_lp_ta.to_account_info(),
                    to: ctx.accounts.dest_lp_ta.to_account_info(),
                    authority: ctx.accounts.lp_ta_authority.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        emit!(LpWithdrawn {
            mint,
            amount,
            to: ctx.accounts.dest_lp_ta.key(),
        });

        Ok(())
    }

    /// Harvester records pending fee amounts after an AMM claim CPI.
    pub fn record_pending_fees(
        ctx: Context<WithdrawLp>,
        fees_a: u64,
        fees_b: u64,
    ) -> Result<()> {
        ctx.accounts.lp_position.pending_fees_a =
            ctx.accounts.lp_position.pending_fees_a.saturating_add(fees_a);
        ctx.accounts.lp_position.pending_fees_b =
            ctx.accounts.lp_position.pending_fees_b.saturating_add(fees_b);
        Ok(())
    }
}
