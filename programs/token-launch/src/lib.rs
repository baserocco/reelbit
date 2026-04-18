use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

// Metaplex Token Metadata program — raw CPI (avoids crate version conflicts)
mod metaplex {
    use anchor_lang::prelude::Pubkey;
    use std::str::FromStr;

    pub const PROGRAM_ID_STR: &str = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

    pub fn program_id() -> Pubkey {
        Pubkey::from_str(PROGRAM_ID_STR).unwrap()
    }

    /// Encode CreateMetadataAccountsV3 instruction data (discriminator = 33).
    pub fn create_metadata_v3_data(name: &str, symbol: &str, uri: &str) -> Vec<u8> {
        let mut d: Vec<u8> = vec![33];
        for s in [name, symbol, uri] {
            d.extend_from_slice(&(s.len() as u32).to_le_bytes());
            d.extend_from_slice(s.as_bytes());
        }
        d.extend_from_slice(&0u16.to_le_bytes()); // seller_fee_basis_points
        d.push(0); d.push(0); d.push(0); // creators, collection, uses: None
        d.push(1); // is_mutable
        d.push(0); // collection_details: None
        d
    }
}

declare_id!("5vy9vYy9A6wAy59nRvvpGd5drVwQU1JYqRuSg7xQZDD8");

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_SUPPLY: u64 = 1_000_000_000 * 10u64.pow(6); // 1B tokens, 6 dec

const VIRTUAL_SOL_RESERVES: u64   = 30 * 1_000_000_000;      // 30 SOL
const VIRTUAL_TOKEN_RESERVES: u64 = 1_073_000_191_000_000;   // 1.073B tokens (6 dec)
const CURVE_TOKEN_SUPPLY: u64     = 793_100_000_000_000;     // 793.1M tokens
const LP_RESERVE_SUPPLY: u64      = 206_900_000_000_000;     // 206.9M tokens — minted at graduation
const MAX_WALLET_BPS: u64         = 500;                      // 5% wallet cap
const GRADUATION_LAMPORTS: u64    = 85_000_000_000;           // 85 SOL

// ── Fee architecture ──────────────────────────────────────────────────────────
//
// Dynamic pre-bond fee tiers (basis points):
//   0–20% to graduation  → 200 bps (2.0%)  — early speculation phase
//  20–60% to graduation  → 150 bps (1.5%)  — momentum phase
//  60–100% to graduation → 100 bps (1.0%)  — final push, reward completion
//
// Fee split (applied at every claim_fees call):
//   Creator    25%  — always paid, even if token never graduates
//   Platform   25%  — platform treasury
//   Jackpot    30%  — per-token jackpot vault (slot machine reads this)
//   Legal      10%  — legal/compliance wallet
//   Licensing  10%  — licensing wallet
//
// 30-day expiry: if not graduated after JACKPOT_EXPIRY_SECS, the 30% jackpot
// allocation redirects to platform. Creator and legal/licensing still paid.

const CREATOR_SHARE_BPS:   u64 = 2_500;
const PLATFORM_SHARE_BPS:  u64 = 2_500;
const JACKPOT_SHARE_BPS:   u64 = 3_000;
const LEGAL_SHARE_BPS:     u64 = 1_000;
const LICENSE_SHARE_BPS:   u64 = 1_000;

const JACKPOT_EXPIRY_SECS:    i64 = 30 * 24 * 60 * 60; // 30 days
const DISTRIBUTION_INTERVAL:  i64 = 30 * 60;            // 30 minutes minimum between claims
const MIN_DISTRIBUTION_LAMPORTS: u64 = 50_000_000;      // 0.05 SOL minimum to distribute

/// Progressive fee rate based on how close the token is to graduation.
fn fee_bps(real_sol: u64) -> u64 {
    let pct = (real_sol as u128 * 100 / GRADUATION_LAMPORTS as u128) as u64;
    if pct < 20 { 200 } else if pct < 60 { 150 } else { 100 }
}

/// Integer division with floor; returns (share, remainder).
fn split_fee(total: u64, share_bps: u64) -> u64 {
    total * share_bps / 10_000
}

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct PlatformConfig {
    pub authority:        Pubkey, // can update config
    pub platform_wallet:  Pubkey,
    pub legal_wallet:     Pubkey,
    pub license_wallet:   Pubkey,
    pub bump:             u8,
}

impl PlatformConfig {
    const LEN: usize = 8 + 32 + 32 + 32 + 32 + 1;
}

#[account]
pub struct SlotMetadata {
    pub creator:      Pubkey,
    pub mint:         Pubkey,
    pub name:         String,
    pub ticker:       String,
    pub image_uri:    String,
    pub model:        SlotModel,
    pub graduated:    bool,
    pub migrated:     bool, // true once bonding curve assets transferred to AMM
    pub total_supply: u64,
    pub created_at:   i64,
    pub bump:         u8,
}

impl SlotMetadata {
    const MAX_NAME:   usize = 32;
    const MAX_TICKER: usize = 10;
    const MAX_URI:    usize = 200;
    const LEN: usize = 8 + 32 + 32
        + (4 + Self::MAX_NAME)
        + (4 + Self::MAX_TICKER)
        + (4 + Self::MAX_URI)
        + 1 + 1 + 1 + 8 + 8 + 1;
}

/// Bonding curve vault — holds trading SOL, tracks reserves + fee distribution state.
#[account]
pub struct BondingCurveVault {
    pub mint:                 Pubkey,
    pub creator:              Pubkey,
    pub virtual_sol:          u64,
    pub virtual_tokens:       u64,
    pub real_sol:             u64,
    pub real_tokens:          u64,
    pub launched_at:          i64, // unix timestamp of launch
    pub last_fee_distribution: i64, // unix timestamp of last claim_fees call
    pub total_fees_accumulated: u64, // lifetime total fees sent to fee_vault
    pub bump:                 u8,
}

impl BondingCurveVault {
    const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1;

    pub fn tokens_for_sol(&self, sol_in: u64) -> u64 {
        let num = (self.virtual_tokens as u128) * (sol_in as u128);
        let den = (self.virtual_sol as u128) + (sol_in as u128);
        (num / den) as u64
    }

    pub fn sol_for_tokens(&self, tokens_in: u64) -> u64 {
        let num = (self.virtual_sol as u128) * (tokens_in as u128);
        let den = (self.virtual_tokens as u128) + (tokens_in as u128);
        (num / den) as u64
    }
}

#[account]
pub struct WalletCap {
    pub mint:         Pubkey,
    pub wallet:       Pubkey,
    pub tokens_held:  u64,
    pub bump:         u8,
}

impl WalletCap {
    const LEN: usize = 8 + 32 + 32 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum SlotModel {
    Classic3Reel,
    Standard5Reel,
    FiveReelFreeSpins,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum TokenLaunchError {
    #[msg("Wallet would exceed 5% token cap")]
    WalletCapExceeded,
    #[msg("Name too long (max 32 chars)")]
    NameTooLong,
    #[msg("Ticker too long (max 10 chars)")]
    TickerTooLong,
    #[msg("Image URI too long (max 200 chars)")]
    ImageUriTooLong,
    #[msg("Metadata URI too long (max 200 chars)")]
    MetadataUriTooLong,
    #[msg("Slot already graduated")]
    AlreadyGraduated,
    #[msg("Zero amount not allowed")]
    ZeroAmount,
    #[msg("Insufficient tokens in curve")]
    InsufficientTokens,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Insufficient SOL in vault")]
    InsufficientSol,
    #[msg("Invalid token metadata program address")]
    InvalidMetadataProgram,
    #[msg("Fee distribution cooldown not elapsed (min 30 min between claims)")]
    DistributionTooSoon,
    #[msg("Accumulated fees below minimum distribution threshold (0.05 SOL)")]
    InsufficientFeesForDistribution,
    #[msg("Only the platform authority can call this")]
    Unauthorized,
    #[msg("Token has not reached graduation threshold")]
    NotGraduated,
    #[msg("Token has already been migrated to AMM")]
    AlreadyMigrated,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct SlotLaunched {
    pub mint:         Pubkey,
    pub creator:      Pubkey,
    pub name:         String,
    pub ticker:       String,
    pub metadata_uri: String,
}

#[event]
pub struct TokensBought {
    pub mint:        Pubkey,
    pub buyer:       Pubkey,
    pub sol_in:      u64,
    pub tokens_out:  u64,
    pub fee_taken:   u64,
    pub fee_bps:     u64,
    pub real_sol:    u64,
    pub real_tokens: u64,
}

#[event]
pub struct TokensSold {
    pub mint:        Pubkey,
    pub seller:      Pubkey,
    pub tokens_in:   u64,
    pub sol_out:     u64,
    pub fee_taken:   u64,
    pub real_sol:    u64,
    pub real_tokens: u64,
}

#[event]
pub struct FeesDistributed {
    pub mint:           Pubkey,
    pub total:          u64,
    pub creator_share:  u64,
    pub platform_share: u64,
    pub jackpot_share:  u64,
    pub legal_share:    u64,
    pub license_share:  u64,
    pub jackpot_expired: bool, // true → jackpot share redirected to platform
}

#[event]
pub struct SlotGraduated {
    pub mint:     Pubkey,
    pub creator:  Pubkey,
    pub real_sol: u64,
}

#[event]
pub struct SlotMigrated {
    pub mint:          Pubkey,
    pub creator:       Pubkey,
    pub pool_address:  Pubkey, // Meteora DLMM LB pair address
    pub sol_seeded:    u64,    // lamports transferred to migration authority
    pub tokens_seeded: u64,    // raw token units (curve remainder + LP reserve)
}

// ── Instruction params ────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LaunchSlotParams {
    pub name:         String,
    pub ticker:       String,
    pub image_uri:    String,
    pub metadata_uri: String,
    pub model:        SlotModel,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitPlatformParams {
    pub platform_wallet: Pubkey,
    pub legal_wallet:    Pubkey,
    pub license_wallet:  Pubkey,
}

// ── Accounts ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = PlatformConfig::LEN,
        seeds = [b"platform_config"],
        bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(params: LaunchSlotParams)]
pub struct LaunchSlot<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = bonding_curve_vault,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve_vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = creator,
        space = SlotMetadata::LEN,
        seeds = [b"slot_metadata", mint.key().as_ref()],
        bump,
    )]
    pub slot_metadata: Account<'info, SlotMetadata>,

    #[account(
        init,
        payer = creator,
        space = BondingCurveVault::LEN,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump,
    )]
    pub bonding_curve_vault: Account<'info, BondingCurveVault>,

    /// Fee vault — pure lamport holder (no data), distributable via claim_fees.
    /// CHECK: PDA validated by seeds; holds SOL only
    #[account(
        mut,
        seeds = [b"fee_vault", mint.key().as_ref()],
        bump,
    )]
    pub fee_vault: SystemAccount<'info>,

    /// Jackpot vault — pure lamport holder, read by the slot machine program.
    /// CHECK: PDA validated by seeds; holds SOL only
    #[account(
        mut,
        seeds = [b"jackpot_vault", mint.key().as_ref()],
        bump,
    )]
    pub jackpot_vault: SystemAccount<'info>,

    /// CHECK: PDA verified by Metaplex program CPI
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: address verified at runtime
    pub token_metadata_program: UncheckedAccount<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"slot_metadata", mint.key().as_ref()],
        bump = slot_metadata.bump,
        constraint = !slot_metadata.graduated @ TokenLaunchError::AlreadyGraduated,
    )]
    pub slot_metadata: Account<'info, SlotMetadata>,

    #[account(
        mut,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump = bonding_curve_vault.bump,
    )]
    pub bonding_curve_vault: Account<'info, BondingCurveVault>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = bonding_curve_vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = buyer,
        space = WalletCap::LEN,
        seeds = [b"wallet_cap", mint.key().as_ref(), buyer.key().as_ref()],
        bump,
    )]
    pub wallet_cap: Account<'info, WalletCap>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// Fee vault — receives the dynamic platform/creator/jackpot fee portion.
    /// CHECK: PDA validated by seeds
    #[account(
        mut,
        seeds = [b"fee_vault", mint.key().as_ref()],
        bump,
    )]
    pub fee_vault: SystemAccount<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"slot_metadata", mint.key().as_ref()],
        bump = slot_metadata.bump,
        constraint = !slot_metadata.graduated @ TokenLaunchError::AlreadyGraduated,
    )]
    pub slot_metadata: Account<'info, SlotMetadata>,

    #[account(
        mut,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump = bonding_curve_vault.bump,
    )]
    pub bonding_curve_vault: Account<'info, BondingCurveVault>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = bonding_curve_vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"wallet_cap", mint.key().as_ref(), seller.key().as_ref()],
        bump = wallet_cap.bump,
    )]
    pub wallet_cap: Account<'info, WalletCap>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    /// Fee vault — receives fee portion from sell proceeds.
    /// CHECK: PDA validated by seeds
    #[account(
        mut,
        seeds = [b"fee_vault", mint.key().as_ref()],
        bump,
    )]
    pub fee_vault: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Permissionless instruction — anyone can call it, but:
///   • min 30-min cooldown enforced
///   • min 0.05 SOL in fee_vault to be worth distributing
///   • destination wallets validated against PlatformConfig
///   • 30-day expiry rule applied automatically
#[derive(Accounts)]
pub struct ClaimFees<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump = bonding_curve_vault.bump,
    )]
    pub bonding_curve_vault: Account<'info, BondingCurveVault>,

    /// Fee vault — source of the distribution.
    /// CHECK: PDA validated by seeds
    #[account(
        mut,
        seeds = [b"fee_vault", mint.key().as_ref()],
        bump,
    )]
    pub fee_vault: SystemAccount<'info>,

    /// Jackpot vault — receives 30% of fees (or 0% if expired, redirected to platform).
    /// CHECK: PDA validated by seeds
    #[account(
        mut,
        seeds = [b"jackpot_vault", mint.key().as_ref()],
        bump,
    )]
    pub jackpot_vault: SystemAccount<'info>,

    #[account(
        seeds = [b"platform_config"],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    /// CHECK: validated against platform_config.platform_wallet
    #[account(mut, constraint = platform_wallet.key() == platform_config.platform_wallet)]
    pub platform_wallet: SystemAccount<'info>,

    /// CHECK: validated against platform_config.legal_wallet
    #[account(mut, constraint = legal_wallet.key() == platform_config.legal_wallet)]
    pub legal_wallet: SystemAccount<'info>,

    /// CHECK: validated against platform_config.license_wallet
    #[account(mut, constraint = license_wallet.key() == platform_config.license_wallet)]
    pub license_wallet: SystemAccount<'info>,

    /// Creator — validated against bonding_curve_vault.creator
    /// CHECK: validated inline
    #[account(mut, constraint = creator.key() == bonding_curve_vault.creator)]
    pub creator: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Called by the migration authority (platform) once a token hits 85 SOL.
/// Drains the bonding curve vault assets to the migration authority so the
/// TypeScript handler can create the Meteora DLMM pool and seed it.
#[derive(Accounts)]
pub struct MigrateToAmm<'info> {
    /// Migration authority — must be the platform authority from PlatformConfig.
    #[account(
        mut,
        constraint = authority.key() == platform_config.authority @ TokenLaunchError::Unauthorized,
    )]
    pub authority: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"slot_metadata", mint.key().as_ref()],
        bump = slot_metadata.bump,
        constraint = slot_metadata.graduated @ TokenLaunchError::NotGraduated,
        constraint = !slot_metadata.migrated @ TokenLaunchError::AlreadyMigrated,
    )]
    pub slot_metadata: Account<'info, SlotMetadata>,

    #[account(
        mut,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump = bonding_curve_vault.bump,
    )]
    pub bonding_curve_vault: Account<'info, BondingCurveVault>,

    /// Vault token account — holds unsold bonding curve tokens.
    #[account(
        mut,
        token::mint = mint,
        token::authority = bonding_curve_vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Authority's token account — receives remaining curve tokens + freshly minted LP reserve.
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub authority_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"platform_config"],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ── Program ───────────────────────────────────────────────────────────────────

#[program]
pub mod token_launch {
    use super::*;

    /// One-time setup: initialize global platform config.
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        params: InitPlatformParams,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.platform_config;
        cfg.authority       = ctx.accounts.authority.key();
        cfg.platform_wallet = params.platform_wallet;
        cfg.legal_wallet    = params.legal_wallet;
        cfg.license_wallet  = params.license_wallet;
        cfg.bump            = ctx.bumps.platform_config;
        Ok(())
    }

    pub fn launch_slot(ctx: Context<LaunchSlot>, params: LaunchSlotParams) -> Result<()> {
        require!(params.name.len()         <= SlotMetadata::MAX_NAME,   TokenLaunchError::NameTooLong);
        require!(params.ticker.len()       <= SlotMetadata::MAX_TICKER, TokenLaunchError::TickerTooLong);
        require!(params.image_uri.len()    <= SlotMetadata::MAX_URI,    TokenLaunchError::ImageUriTooLong);
        require!(params.metadata_uri.len() <= SlotMetadata::MAX_URI,    TokenLaunchError::MetadataUriTooLong);
        require_keys_eq!(
            ctx.accounts.token_metadata_program.key(),
            metaplex::program_id(),
            TokenLaunchError::InvalidMetadataProgram,
        );

        let mint_key    = ctx.accounts.mint.key();
        let vault_bump  = ctx.bumps.bonding_curve_vault;
        let vault_seeds: &[&[u8]] = &[b"bonding_curve", mint_key.as_ref(), &[vault_bump]];
        let signer_seeds = &[vault_seeds];
        let now = Clock::get()?.unix_timestamp;

        let m = &mut ctx.accounts.slot_metadata;
        m.creator      = ctx.accounts.creator.key();
        m.mint         = mint_key;
        m.name         = params.name.clone();
        m.ticker       = params.ticker.clone();
        m.image_uri    = params.image_uri.clone();
        m.model        = params.model;
        m.graduated    = false;
        m.migrated     = false;
        m.total_supply = TOTAL_SUPPLY;
        m.created_at   = now;
        m.bump         = ctx.bumps.slot_metadata;

        let v = &mut ctx.accounts.bonding_curve_vault;
        v.mint                  = mint_key;
        v.creator               = ctx.accounts.creator.key();
        v.virtual_sol           = VIRTUAL_SOL_RESERVES;
        v.virtual_tokens        = VIRTUAL_TOKEN_RESERVES;
        v.real_sol              = 0;
        v.real_tokens           = CURVE_TOKEN_SUPPLY;
        v.launched_at           = now;
        v.last_fee_distribution = now;
        v.total_fees_accumulated = 0;
        v.bump                  = vault_bump;

        // Mint curve supply into vault token account
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                MintTo {
                    mint:      ctx.accounts.mint.to_account_info(),
                    to:        ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.bonding_curve_vault.to_account_info(),
                },
                signer_seeds,
            ),
            CURVE_TOKEN_SUPPLY,
        )?;

        // Create Metaplex token metadata
        let ix_data = metaplex::create_metadata_v3_data(&params.name, &params.ticker, &params.metadata_uri);
        let metadata_ix = anchor_lang::solana_program::instruction::Instruction {
            program_id: metaplex::program_id(),
            accounts: vec![
                anchor_lang::solana_program::instruction::AccountMeta::new(ctx.accounts.metadata.key(), false),
                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(mint_key, false),
                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.bonding_curve_vault.key(), true),
                anchor_lang::solana_program::instruction::AccountMeta::new(ctx.accounts.creator.key(), true),
                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.creator.key(), false),
                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.rent.key(), false),
            ],
            data: ix_data,
        };

        anchor_lang::solana_program::program::invoke_signed(
            &metadata_ix,
            &[
                ctx.accounts.metadata.to_account_info(),
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.bonding_curve_vault.to_account_info(),
                ctx.accounts.creator.to_account_info(),
                ctx.accounts.token_metadata_program.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.rent.to_account_info(),
            ],
            signer_seeds,
        )?;

        emit!(SlotLaunched {
            mint: mint_key,
            creator: ctx.accounts.creator.key(),
            name: params.name,
            ticker: params.ticker,
            metadata_uri: params.metadata_uri,
        });

        Ok(())
    }

    pub fn buy_tokens(ctx: Context<BuyTokens>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
        require!(sol_amount > 0, TokenLaunchError::ZeroAmount);

        let current_fee_bps = fee_bps(ctx.accounts.bonding_curve_vault.real_sol);
        let fee_amount       = sol_amount * current_fee_bps / 10_000;
        let trading_sol      = sol_amount.saturating_sub(fee_amount);

        let tokens_out = ctx.accounts.bonding_curve_vault.tokens_for_sol(trading_sol);
        require!(tokens_out > 0, TokenLaunchError::ZeroAmount);
        require!(tokens_out >= min_tokens_out, TokenLaunchError::SlippageExceeded);
        require!(tokens_out <= ctx.accounts.bonding_curve_vault.real_tokens, TokenLaunchError::InsufficientTokens);

        let max_tokens = ctx.accounts.slot_metadata.total_supply * MAX_WALLET_BPS / 10_000;
        require!(
            ctx.accounts.wallet_cap.tokens_held + tokens_out <= max_tokens,
            TokenLaunchError::WalletCapExceeded,
        );

        let sys_pid = ctx.accounts.system_program.key();

        // buyer → bonding_curve_vault (trading portion)
        system_program::transfer(
            CpiContext::new(
                sys_pid,
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.bonding_curve_vault.to_account_info(),
                },
            ),
            trading_sol,
        )?;

        // buyer → fee_vault (dynamic fee accumulated for later distribution)
        if fee_amount > 0 {
            system_program::transfer(
                CpiContext::new(
                    sys_pid,
                    system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.fee_vault.to_account_info(),
                    },
                ),
                fee_amount,
            )?;
        }

        // vault → buyer: token transfer (PDA signed)
        let mint_key   = ctx.accounts.mint.key();
        let vault_bump = ctx.accounts.bonding_curve_vault.bump;
        let vault_seeds: &[&[u8]] = &[b"bonding_curve", mint_key.as_ref(), &[vault_bump]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from:      ctx.accounts.vault_token_account.to_account_info(),
                    to:        ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.bonding_curve_vault.to_account_info(),
                },
                &[vault_seeds],
            ),
            tokens_out,
        )?;

        let vault = &mut ctx.accounts.bonding_curve_vault;
        vault.virtual_sol             += sol_amount;    // virtual tracks full amount including fee
        vault.virtual_tokens          -= tokens_out;
        vault.real_sol                += trading_sol;
        vault.real_tokens             -= tokens_out;
        vault.total_fees_accumulated  += fee_amount;

        let cap = &mut ctx.accounts.wallet_cap;
        cap.mint        = mint_key;
        cap.wallet      = ctx.accounts.buyer.key();
        cap.tokens_held += tokens_out;
        cap.bump        = ctx.bumps.wallet_cap;

        let new_real_sol    = vault.real_sol;
        let new_real_tokens = vault.real_tokens;

        emit!(TokensBought {
            mint:        mint_key,
            buyer:       ctx.accounts.buyer.key(),
            sol_in:      sol_amount,
            tokens_out,
            fee_taken:   fee_amount,
            fee_bps:     current_fee_bps,
            real_sol:    new_real_sol,
            real_tokens: new_real_tokens,
        });

        if new_real_sol >= GRADUATION_LAMPORTS {
            ctx.accounts.slot_metadata.graduated = true;
            emit!(SlotGraduated {
                mint:     mint_key,
                creator:  ctx.accounts.bonding_curve_vault.creator,
                real_sol: new_real_sol,
            });
        }

        Ok(())
    }

    pub fn sell_tokens(ctx: Context<SellTokens>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        require!(token_amount > 0, TokenLaunchError::ZeroAmount);

        let gross_sol = ctx.accounts.bonding_curve_vault.sol_for_tokens(token_amount);
        require!(gross_sol > 0, TokenLaunchError::ZeroAmount);
        require!(gross_sol <= ctx.accounts.bonding_curve_vault.real_sol, TokenLaunchError::InsufficientSol);

        let current_fee_bps = fee_bps(ctx.accounts.bonding_curve_vault.real_sol);
        let fee_amount       = gross_sol * current_fee_bps / 10_000;
        let net_sol          = gross_sol.saturating_sub(fee_amount);
        require!(net_sol >= min_sol_out, TokenLaunchError::SlippageExceeded);

        // seller → vault: token transfer
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from:      ctx.accounts.seller_token_account.to_account_info(),
                    to:        ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            token_amount,
        )?;

        // vault → seller: SOL (lamport manipulation — PDA has data so system_program::transfer
        // cannot be used as `from`)
        **ctx.accounts.bonding_curve_vault.to_account_info().try_borrow_mut_lamports()? -= gross_sol;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += net_sol;
        // fee portion → fee_vault (also via lamport manipulation since source is data-bearing PDA)
        if fee_amount > 0 {
            **ctx.accounts.fee_vault.to_account_info().try_borrow_mut_lamports()? += fee_amount;
        }

        let vault = &mut ctx.accounts.bonding_curve_vault;
        vault.virtual_sol            -= gross_sol;
        vault.virtual_tokens         += token_amount;
        vault.real_sol               -= gross_sol;
        vault.real_tokens            += token_amount;
        vault.total_fees_accumulated += fee_amount;

        ctx.accounts.wallet_cap.tokens_held =
            ctx.accounts.wallet_cap.tokens_held.saturating_sub(token_amount);

        let new_real_sol    = vault.real_sol;
        let new_real_tokens = vault.real_tokens;

        emit!(TokensSold {
            mint:        ctx.accounts.mint.key(),
            seller:      ctx.accounts.seller.key(),
            tokens_in:   token_amount,
            sol_out:     net_sol,
            fee_taken:   fee_amount,
            real_sol:    new_real_sol,
            real_tokens: new_real_tokens,
        });

        Ok(())
    }

    /// Distribute accumulated fees from the fee_vault to all recipients.
    /// Permissionless — anyone can call it — but enforces:
    ///   • 30-minute cooldown between calls
    ///   • 0.05 SOL minimum to prevent dust distributions
    ///   • 30-day jackpot expiry (expired → jackpot share goes to platform)
    ///   • All destination wallets validated against PlatformConfig
    pub fn claim_fees(ctx: Context<ClaimFees>) -> Result<()> {
        let vault = &ctx.accounts.bonding_curve_vault;
        let now   = Clock::get()?.unix_timestamp;

        // Cooldown check
        require!(
            now - vault.last_fee_distribution >= DISTRIBUTION_INTERVAL,
            TokenLaunchError::DistributionTooSoon,
        );

        // Calculate distributable balance (keep rent-exempt minimum in fee_vault).
        // fee_vault is a system account so rent exemption is ~0.00089 SOL (2MB).
        // We approximate: leave 890_880 lamports (standard rent-exempt floor for 0 bytes).
        let rent_exempt_min: u64 = 890_880;
        let fee_vault_balance = ctx.accounts.fee_vault.lamports();
        let distributable = fee_vault_balance.saturating_sub(rent_exempt_min);

        require!(
            distributable >= MIN_DISTRIBUTION_LAMPORTS,
            TokenLaunchError::InsufficientFeesForDistribution,
        );

        // 30-day jackpot expiry: if the token hasn't graduated and it's been >30 days
        // since launch, the jackpot allocation is redirected to the platform.
        let jackpot_expired = !ctx.accounts.bonding_curve_vault.slot_metadata_graduated()
            && (now - vault.launched_at) > JACKPOT_EXPIRY_SECS;

        let creator_share  = split_fee(distributable, CREATOR_SHARE_BPS);
        let jackpot_raw    = split_fee(distributable, JACKPOT_SHARE_BPS);
        let legal_share    = split_fee(distributable, LEGAL_SHARE_BPS);
        let license_share  = split_fee(distributable, LICENSE_SHARE_BPS);

        let (jackpot_share, platform_share) = if jackpot_expired {
            // Jackpot allocation redirects to platform after 30 days without graduation
            let platform_base = split_fee(distributable, PLATFORM_SHARE_BPS);
            (0u64, platform_base + jackpot_raw)
        } else {
            (jackpot_raw, split_fee(distributable, PLATFORM_SHARE_BPS))
        };

        // Remainder (rounding dust) stays in fee_vault for next round
        let total_out = creator_share + platform_share + jackpot_share + legal_share + license_share;

        let mint_key       = ctx.accounts.mint.key();
        let fee_vault_bump = ctx.bumps.fee_vault;
        let fee_vault_seeds: &[&[u8]] = &[b"fee_vault", mint_key.as_ref(), &[fee_vault_bump]];
        let fee_signer_seeds = &[fee_vault_seeds];
        let sys_pid = ctx.accounts.system_program.key();

        // fee_vault → creator
        if creator_share > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    sys_pid,
                    system_program::Transfer {
                        from: ctx.accounts.fee_vault.to_account_info(),
                        to:   ctx.accounts.creator.to_account_info(),
                    },
                    fee_signer_seeds,
                ),
                creator_share,
            )?;
        }

        // fee_vault → platform
        if platform_share > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    sys_pid,
                    system_program::Transfer {
                        from: ctx.accounts.fee_vault.to_account_info(),
                        to:   ctx.accounts.platform_wallet.to_account_info(),
                    },
                    fee_signer_seeds,
                ),
                platform_share,
            )?;
        }

        // fee_vault → jackpot_vault
        if jackpot_share > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    sys_pid,
                    system_program::Transfer {
                        from: ctx.accounts.fee_vault.to_account_info(),
                        to:   ctx.accounts.jackpot_vault.to_account_info(),
                    },
                    fee_signer_seeds,
                ),
                jackpot_share,
            )?;
        }

        // fee_vault → legal
        if legal_share > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    sys_pid,
                    system_program::Transfer {
                        from: ctx.accounts.fee_vault.to_account_info(),
                        to:   ctx.accounts.legal_wallet.to_account_info(),
                    },
                    fee_signer_seeds,
                ),
                legal_share,
            )?;
        }

        // fee_vault → licensing
        if license_share > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    sys_pid,
                    system_program::Transfer {
                        from: ctx.accounts.fee_vault.to_account_info(),
                        to:   ctx.accounts.license_wallet.to_account_info(),
                    },
                    fee_signer_seeds,
                ),
                license_share,
            )?;
        }

        // Update distribution timestamp
        ctx.accounts.bonding_curve_vault.last_fee_distribution = now;

        emit!(FeesDistributed {
            mint: mint_key,
            total: total_out,
            creator_share,
            platform_share,
            jackpot_share,
            legal_share,
            license_share,
            jackpot_expired,
        });

        Ok(())
    }

    /// Called once by the migration authority after a SlotGraduated event.
    /// Transfers all vault assets (remaining curve tokens + LP reserve mint + vault SOL)
    /// to the migration authority. The authority then creates the Meteora DLMM pool
    /// off-chain and calls back with the pool address (recorded in the event).
    pub fn migrate_to_amm(ctx: Context<MigrateToAmm>, pool_address: Pubkey) -> Result<()> {
        let mint_key   = ctx.accounts.mint.key();
        let vault_bump = ctx.accounts.bonding_curve_vault.bump;
        let vault_seeds: &[&[u8]] = &[b"bonding_curve", mint_key.as_ref(), &[vault_bump]];

        // ── 1. Transfer remaining bonding curve tokens → authority ────────────
        let curve_tokens_remaining = ctx.accounts.vault_token_account.amount;
        if curve_tokens_remaining > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    Transfer {
                        from:      ctx.accounts.vault_token_account.to_account_info(),
                        to:        ctx.accounts.authority_token_account.to_account_info(),
                        authority: ctx.accounts.bonding_curve_vault.to_account_info(),
                    },
                    &[vault_seeds],
                ),
                curve_tokens_remaining,
            )?;
        }

        // ── 2. Mint LP reserve tokens → authority ─────────────────────────────
        // These 206.9M tokens were never put on the bonding curve; they are minted
        // fresh at graduation and seeded directly into the DLMM pool.
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                MintTo {
                    mint:      ctx.accounts.mint.to_account_info(),
                    to:        ctx.accounts.authority_token_account.to_account_info(),
                    authority: ctx.accounts.bonding_curve_vault.to_account_info(),
                },
                &[vault_seeds],
            ),
            LP_RESERVE_SUPPLY,
        )?;

        // ── 3. Drain SOL from bonding_curve_vault → authority ─────────────────
        // bonding_curve_vault is data-bearing so we use lamport manipulation.
        let vault_lamports = ctx.accounts.bonding_curve_vault.to_account_info().lamports();
        let rent_min = Rent::get()?.minimum_balance(BondingCurveVault::LEN);
        let sol_to_transfer = vault_lamports.saturating_sub(rent_min);

        if sol_to_transfer > 0 {
            **ctx.accounts.bonding_curve_vault.to_account_info().try_borrow_mut_lamports()? -= sol_to_transfer;
            **ctx.accounts.authority.to_account_info().try_borrow_mut_lamports()? += sol_to_transfer;
        }

        // ── 4. Mark migrated ──────────────────────────────────────────────────
        ctx.accounts.slot_metadata.migrated = true;

        let total_tokens = curve_tokens_remaining + LP_RESERVE_SUPPLY;

        emit!(SlotMigrated {
            mint:          mint_key,
            creator:       ctx.accounts.bonding_curve_vault.creator,
            pool_address,
            sol_seeded:    sol_to_transfer,
            tokens_seeded: total_tokens,
        });

        Ok(())
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

impl BondingCurveVault {
    /// Proxy: graduation state is stored in SlotMetadata but we need it in claim_fees.
    /// We check indirectly: if real_sol >= GRADUATION_LAMPORTS the token has graduated.
    pub fn slot_metadata_graduated(&self) -> bool {
        self.real_sol >= GRADUATION_LAMPORTS
    }
}
