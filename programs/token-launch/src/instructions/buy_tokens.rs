use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::errors::TokenLaunchError;
use crate::state::{SlotMetadata, WalletCap};

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"slot_metadata", mint.key().as_ref()],
        bump = slot_metadata.bump,
        constraint = !slot_metadata.graduated @ TokenLaunchError::AlreadyGraduated,
    )]
    pub slot_metadata: Account<'info, SlotMetadata>,

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
        token::mint = mint,
        token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<BuyTokens>, sol_amount: u64) -> Result<()> {
    require!(sol_amount > 0, TokenLaunchError::ZeroAmount);

    let wallet_cap = &mut ctx.accounts.wallet_cap;
    let metadata = &ctx.accounts.slot_metadata;

    // 5% wallet cap check
    let total_supply = metadata.total_supply;
    let max_tokens = total_supply * WalletCap::MAX_BPS / 10_000;

    // Token amount calculation via DLMM CPI happens here
    // For now: placeholder — actual swap goes through Meteora DLMM CPI
    let tokens_out: u64 = sol_amount * 200_000; // approximate, DLMM sets real price

    require!(
        wallet_cap.tokens_held + tokens_out <= max_tokens,
        TokenLaunchError::WalletCapExceeded
    );

    wallet_cap.mint = ctx.accounts.mint.key();
    wallet_cap.wallet = ctx.accounts.buyer.key();
    wallet_cap.tokens_held += tokens_out;

    Ok(())
}
