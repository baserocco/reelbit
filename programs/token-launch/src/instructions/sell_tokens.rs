use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::errors::TokenLaunchError;
use crate::state::{SlotMetadata, WalletCap};

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

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
        mut,
        seeds = [b"wallet_cap", mint.key().as_ref(), seller.key().as_ref()],
        bump,
    )]
    pub wallet_cap: Account<'info, WalletCap>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SellTokens>, token_amount: u64) -> Result<()> {
    require!(token_amount > 0, TokenLaunchError::ZeroAmount);

    let wallet_cap = &mut ctx.accounts.wallet_cap;

    // Actual swap goes through Meteora DLMM CPI
    // Update wallet cap tracking on sell
    wallet_cap.tokens_held = wallet_cap.tokens_held.saturating_sub(token_amount);

    Ok(())
}
