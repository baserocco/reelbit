use anchor_lang::prelude::*;

#[account]
pub struct SlotMetadata {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub dlmm_pool: Pubkey,
    pub name: String,        // max 32 chars
    pub ticker: String,      // max 10 chars
    pub image_uri: String,   // max 200 chars
    pub model: SlotModel,
    pub graduated: bool,
    pub total_supply: u64,   // 1_000_000_000 * 10^6
    pub created_at: i64,
    pub bump: u8,
}

impl SlotMetadata {
    pub const MAX_NAME_LEN: usize = 32;
    pub const MAX_TICKER_LEN: usize = 10;
    pub const MAX_IMAGE_URI_LEN: usize = 200;

    pub const LEN: usize = 8          // discriminator
        + 32                          // creator
        + 32                          // mint
        + 32                          // dlmm_pool
        + 4 + Self::MAX_NAME_LEN      // name
        + 4 + Self::MAX_TICKER_LEN    // ticker
        + 4 + Self::MAX_IMAGE_URI_LEN // image_uri
        + 1                           // model enum
        + 1                           // graduated
        + 8                           // total_supply
        + 8                           // created_at
        + 1;                          // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum SlotModel {
    Classic3Reel,    // 3 reels × 3 rows, 5 paylines
    Standard5Reel,   // 5 reels × 3 rows, 20 paylines, Wild + Scatter
    FiveReelFreeSpins, // 5 reels × 3 rows, 20 paylines, Wild + Scatter + 8 free spins
}

#[account]
pub struct WalletCap {
    pub mint: Pubkey,
    pub wallet: Pubkey,
    pub tokens_held: u64,
    pub bump: u8,
}

impl WalletCap {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1;
    pub const MAX_BPS: u64 = 500; // 5% in basis points
}
