#!/usr/bin/env bash
# Sets up local dev environment for Sprint 1
set -e

echo "=== ReelBit Devnet Setup ==="

echo "Checking dependencies..."
command -v node >/dev/null 2>&1 || { echo "Node.js 18+ required"; exit 1; }
command -v rustup >/dev/null 2>&1 || { echo "Rust required: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"; exit 1; }
command -v anchor >/dev/null 2>&1 || { echo "Anchor CLI required: cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install 0.30.1 && avm use 0.30.1"; exit 1; }
command -v solana >/dev/null 2>&1 || { echo "Solana CLI required: sh -c \"\$(curl -sSfL https://release.solana.com/v1.18.22/install)\""; exit 1; }

echo "Configuring Solana for devnet..."
solana config set --url devnet

echo "Creating wallets (if they don't exist)..."
[ -f ~/.config/solana/id.json ]          || solana-keygen new --outfile ~/.config/solana/id.json --no-bip39-passphrase
[ -f ~/.config/solana/platform.json ]    || solana-keygen new --outfile ~/.config/solana/platform.json --no-bip39-passphrase
[ -f ~/.config/solana/harvester.json ]   || solana-keygen new --outfile ~/.config/solana/harvester.json --no-bip39-passphrase
[ -f ~/.config/solana/upgrade-auth.json ]|| solana-keygen new --outfile ~/.config/solana/upgrade-auth.json --no-bip39-passphrase

echo "Airdropping SOL to deployer wallet..."
solana airdrop 2 ~/.config/solana/id.json || echo "Airdrop failed — try manually: solana airdrop 2"

echo "Installing Node dependencies..."
npm install

echo ""
echo "=== Setup complete ==="
echo "Deployer wallet: $(solana address)"
echo "Next: anchor build && anchor deploy"
