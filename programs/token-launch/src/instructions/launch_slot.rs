use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::errors::TokenLaunchError;
use crate::state::{SlotMetadata, SlotModel};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LaunchSlotParams {
    pub name: String,
    pub ticker: String,
    pub image_uri: String,
    pub model: SlotModel,
}

#[derive(Accounts)]
#[instruction(params: LaunchSlotParams)]
pub struct LaunchSlot<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    /// SPL token mint — creator pays rent, program is mint authority
    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = slot_metadata,
    )]
    pub mint: Account<'info, Mint>,

    /// Creator's token account receives nothing at launch (no pre-allocation)
    #[account(
        init,
        payer = creator,
        token::mint = mint,
        token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    /// Slot metadata PDA — stores all on-chain slot state
    #[account(
        init,
        payer = creator,
        space = SlotMetadata::LEN,
        seeds = [b"slot_metadata", mint.key().as_ref()],
        bump,
    )]
    pub slot_metadata: Account<'info, SlotMetadata>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<LaunchSlot>, params: LaunchSlotParams) -> Result<()> {
    require!(params.name.len() <= SlotMetadata::MAX_NAME_LEN, TokenLaunchError::NameTooLong);
    require!(params.ticker.len() <= SlotMetadata::MAX_TICKER_LEN, TokenLaunchError::TickerTooLong);
    require!(params.image_uri.len() <= SlotMetadata::MAX_IMAGE_URI_LEN, TokenLaunchError::ImageUriTooLong);

    let metadata = &mut ctx.accounts.slot_metadata;
    metadata.creator = ctx.accounts.creator.key();
    metadata.mint = ctx.accounts.mint.key();
    metadata.dlmm_pool = Pubkey::default(); // set after DLMM pool creation (separate CPI)
    metadata.name = params.name;
    metadata.ticker = params.ticker;
    metadata.image_uri = params.image_uri;
    metadata.model = params.model;
    metadata.graduated = false;
    metadata.total_supply = 1_000_000_000 * 10u64.pow(6); // 1B tokens, 6 decimals
    metadata.created_at = Clock::get()?.unix_timestamp;
    metadata.bump = ctx.bumps.slot_metadata;

    // DLMM pool seeding happens in a separate instruction via CPI to Meteora
    // Initial bin: $0.000005 per token = $5k MCap display (no real SOL needed)
    // The pool is seeded one-sided with tokens only

    emit!(SlotLaunched {
        mint: metadata.mint,
        creator: metadata.creator,
        name: metadata.name.clone(),
        ticker: metadata.ticker.clone(),
        model: metadata.model.clone(),
    });

    Ok(())
}

#[event]
pub struct SlotLaunched {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub ticker: String,
    pub model: SlotModel,
}
