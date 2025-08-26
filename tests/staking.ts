import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Staking } from "../target/types/staking";
import { PublicKey } from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";

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
  const associatedTokenProgram = anchor.utils.token.ASSOCIATED_PROGRAM_ID;

  let userAccount: PublicKey;
  let configPda: PublicKey;
  let rewardMint: PublicKey;
  let stakeAccount: PublicKey;

  let nftMint: PublicKey;
  let collectionMint: PublicKey;
  let userNftAta: PublicKey;
  let metadata: PublicKey;
  let edition: PublicKey;

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

  before(async () => {
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

    nftMint = await spl.createMint(connection, admin, admin.publicKey, null, 0);

    collectionMint = await spl.createMint(
      connection,
      admin,
      admin.publicKey,
      null,
      0
    );

    userNftAta = await spl.createAssociatedTokenAccount(
      connection,
      admin,
      nftMint,
      admin.publicKey
    );
    const userCollectionAta = await spl.createAssociatedTokenAccount(
      connection,
      admin,
      collectionMint,
      admin.publicKey
    );

    await spl.mintTo(connection, admin, nftMint, userNftAta, admin, 1);
    await spl.mintTo(
      connection,
      admin,
      collectionMint,
      userCollectionAta,
      admin,
      1
    );

    [metadata] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        Buffer.from(MPL_TOKEN_METADATA_PROGRAM_ID.toString()),
        nftMint.toBuffer(),
      ],
      new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID)
    );

    [edition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        Buffer.from(MPL_TOKEN_METADATA_PROGRAM_ID.toString()),
        nftMint.toBuffer(),
        Buffer.from("edition"),
      ],
      new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID)
    );

    [stakeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake"), nftMint.toBuffer(), configPda.toBuffer()],
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

  it("stake nft", async () => {
    const tx = await program.methods
      .stake()
      .accountsPartial({
        user: admin.publicKey,
        userAccount,
        config: configPda,
        collectionMint,
        edition,
        metadata,
        metadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        nftMint,
        stakeAccount,
        systemProgram,
        tokenProgram,
        userNftAta,
      })
      .rpc();

    console.log("Your transaction signature", tx);
  });

  it("unstake nft", async () => {
    await waitForFreezePeriod(4);

    const tx = await program.methods
      .unstake()
      .accountsPartial({
        config: configPda,
        edition,
        metadata,
        metadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        nftMint,
        stakeAccount,
        systemProgram,
        tokenProgram,
        user: admin.publicKey,
        userAccount,
        userNftAta,
      })
      .rpc();

    console.log("Your transaction signature", tx);
  });

  it("claim reward mint tokens", async () => {
    const rewardAta = spl.getAssociatedTokenAddressSync(
      rewardMint,
      admin.publicKey,
      true
    );
    const tx = await program.methods
      .claim()
      .accountsPartial({
        associatedTokenProgram,
        config: configPda,
        rewardAta,
        rewardMint,
        systemProgram,
        tokenProgram,
        user: admin.publicKey,
        userAccount,
      })
      .rpc();

    console.log("Your transaction signature", tx);
  });
});
