use anchor_lang::prelude::*;

declare_id!("TokenLaunch111111111111111111111111111111111");

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

#[program]
pub mod token_launch {
    use super::*;

    /// Creates SPL token (1B supply), seeds Meteora DLMM pool at $0.000005/token,
    /// registers slot metadata PDA, enforces 5% wallet cap.
    pub fn launch_slot(ctx: Context<LaunchSlot>, params: LaunchSlotParams) -> Result<()> {
        instructions::launch_slot::handler(ctx, params)
    }

    /// Buys tokens on the bonding curve. Enforces 5% wallet cap.
    pub fn buy_tokens(ctx: Context<BuyTokens>, sol_amount: u64) -> Result<()> {
        instructions::buy_tokens::handler(ctx, sol_amount)
    }

    /// Sells tokens on the bonding curve.
    pub fn sell_tokens(ctx: Context<SellTokens>, token_amount: u64) -> Result<()> {
        instructions::sell_tokens::handler(ctx, token_amount)
    }
}
