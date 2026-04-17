use anchor_lang::prelude::*;

#[error_code]
pub enum TokenLaunchError {
    #[msg("Wallet would exceed 5% token cap")]
    WalletCapExceeded,
    #[msg("Slot name too long (max 32 chars)")]
    NameTooLong,
    #[msg("Ticker too long (max 10 chars)")]
    TickerTooLong,
    #[msg("Image URI too long (max 200 chars)")]
    ImageUriTooLong,
    #[msg("Slot already graduated")]
    AlreadyGraduated,
    #[msg("Bundle transaction detected")]
    BundleDetected,
    #[msg("Insufficient SOL for purchase")]
    InsufficientFunds,
    #[msg("Zero amount not allowed")]
    ZeroAmount,
}
