import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Staking } from "../target/types/staking";
import { PublicKey } from "@solana/web3.js";

describe("staking", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.staking as Program<Staking>;
  const programId = program.programId;
  const provider = anchor.getProvider();
  const connection = provider.connection;
  const admin = provider.wallet.payer;
  const systemProgram = anchor.web3.SystemProgram.programId;
  const tokenProgram = anchor.utils.token.TOKEN_PROGRAM_ID;

  let userAccount: PublicKey;
  let configPda: PublicKey;
  let rewardMint: PublicKey;

  const pointsPerStake = 4;
  const maxStake = 4;
  const freezePeriod = 0.004; // ~ 4 seconds

  const waitForFreezePeriod = async (seconds: number) => {
    const start = await connection.getBlockTime(await connection.getSlot());

    while (true) {
      // a dummy tranassaction
      const tx = new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.transfer({
          fromPubkey: admin.publicKey,
          toPubkey: admin.publicKey,
          lamports: 0,
        })
      );

      await provider.sendAndConfirm(tx, [admin]);

      const current = await connection.getBlockTime(await connection.getSlot());

      if (current - start >= seconds) break;

      await new Promise((r) => setTimeout(r, 500));
    }
  };

  before(() => {
    [userAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), admin.publicKey.toBuffer()],
      programId
    );
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );
    [rewardMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("rewards"), configPda.toBuffer()],
      programId
    );
  });

  it("initiates config", async () => {
    const tx = await program.methods
      .initializeConfig(pointsPerStake, maxStake, freezePeriod)
      .accountsPartial({
        admin: admin.publicKey,
        config: configPda,
        rewardMint: rewardMint,
        systemProgram,
        tokenProgram,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("initiates user", async () => {
    // Add your test here.
    const tx = await program.methods
      .initializeUser()
      .accountsPartial({
        user: admin.publicKey,
        userAccount,
        systemProgram,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("create nft mint, edition, collection, etc...", () => {});
  it("stake nft", () => {});
  it("unstake nft", () => {});
});
