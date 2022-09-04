const { ethers, waffle } = require("hardhat");
const { expect } = require("chai");

describe("Staking", () => {
  beforeEach(async function () {
    [signer1, signer2] = await ethers.getSigners(); // Setting up wallets

    Staking = await ethers.getContractFactory("Staking", signer1);

    staking = await Staking.deploy({
      value: ethers.utils.parseEther("10"),
    });
  });

  describe("deploy", () => {
    it("should set owner", async function () {
      expect(await staking.owner()).to.equal(signer1.address);
    });
    it("set up tiers and lock periods", async function () {
      expect(await staking.lockPeriods(0)).to.equal(10);
      expect(await staking.lockPeriods(1)).to.equal(30);
      expect(await staking.lockPeriods(2)).to.equal(90);

      expect(await staking.numberOfDaysWithInterest(10)).to.equal(700);
      expect(await staking.numberOfDaysWithInterest(30)).to.equal(900);
      expect(await staking.numberOfDaysWithInterest(90)).to.equal(1200);
    });
  });

  describe("stakeEther", () => {
    it("transfer ether", async function () {
      const provider = waffle.provider;
      let contractBalance; // increase when function called
      let signerBalance; // decrease when function called
      const transferAmount = ethers.utils.parseEther("2.0");

      contractBalance = await provider.getBalance(staking.address);
      signerBalance = await signer1.getBalance();

      const data = { value: transferAmount };
      const transaction = await staking.connect(signer1).stakeEther(30, data);
      const receipt = await transaction.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      // Test the change in signer1's ether balance
      expect(await signer1.getBalance()).to.equal(
        signerBalance.sub(transferAmount).sub(gasUsed)
      );

      // Test the change in contract's ether balance
      expect(await provider.getBalance(staking.address)).to.equal(
        contractBalance.add(transferAmount)
      );
    });

    it("adds a position to positions", async function () {
      const provider = waffle.provider;
      let position;
      const transferAmount = ethers.utils.parseEther("1.0");

      position = await staking.positions(0);

      expect(position.positionId).to.equal(0);
      expect(position.walletAddress).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
      expect(position.createdDate).to.equal(0);
      expect(position.unlockDate).to.equal(0);
      expect(position.percentInterest).to.equal(0);
      expect(position.weiStaked).to.equal(0);
      expect(position.weiInterest).to.equal(0);
      expect(position.open).to.equal(false);

      expect(await staking.currentPositionId()).to.equal(0);

      data = { value: transferAmount };
      const transaction = await staking.connect(signer1).stakeEther(90, data);
      const receipt = await transaction.wait();
      const block = await provider.getBlock(receipt.blockNumber);

      position = await staking.positions(0);

      expect(position.positionId).to.equal(0);
      expect(position.walletAddress).to.equal(signer1.address);
      expect(position.createdDate).to.equal(block.timestamp);
      expect(position.unlockDate).to.equal(block.timestamp + 86400 * 90);
      expect(position.percentInterest).to.equal(1200);
      expect(position.weiStaked).to.equal(transferAmount);
      expect(position.weiInterest).to.equal(
        ethers.BigNumber.from(transferAmount).mul(1200).div(10000)
      );
      expect(position.open).to.equal(true);

      expect(await staking.currentPositionId()).to.equal(1);
    });

    // it('adds address and positionId to positionIdsByAddress', async function() {
    //     const transferAmount = ethers.utils.parseEther('0.5');

    //     const data = { value: transferAmount }
    //     await staking.connect(signer1).stakeEther(10, data);
    //     await staking.connect(signer1).stakeEther(10, data);
    //     await staking.connect(signer1).stakeEther(30, data);

    //     expect(await staking.positionIdsByAddress(signer1.address, 0)).to.equal(0);
    //     expect(await staking.positionIdsByAddress(signer1.address, 1)).to.equal(1);
    //     expect(await staking.positionIdsByAddress(signer2.address, 0)).to.equal(2);

    // });
  });

  describe("modifyLockPeriods", () => {
    describe("owner", () => {
      it("should create a new block period", async function () {
        await staking.connect(signer1).modifyLockPeriods(100, 999);

        expect(await staking.numberOfDaysWithInterest(100)).to.equal(999);
        expect(await staking.lockPeriods(3)).to.equal(100);
      });
      it("should modify an existing lock period", async function () {
        await staking.connect(signer1).modifyLockPeriods(10, 150);

        expect(await staking.numberOfDaysWithInterest(30)).to.equal(900);
      });
    });

    describe("non-owner", () => {
      it("should reverts", async function () {
        expect(
          staking.connect(signer1).modifyLockPeriods(100, 999)
        ).to.be.revertedWith("Only owner may modify staking periods");
      });
    });
  });

  describe("getLockPeriods", () => {
    it("returns all lock periods", async () => {
      const lockPeriods = await staking.getLockPeriods();

      expect(lockPeriods.map((v) => Number(v._hex))).to.eql([10, 30, 90]);
    });
  });

  describe("getInterestsRate", () => {
    it("returns the interest rate for a specific lockPeriod", async () => {
      const interestRate = await staking.getInterestRate(10);
      expect(interestRate).to.equal(700);
    });
  });

  describe("getPositionById", () => {
    it("returns data about a specific position, given a positionId", async () => {
      const provider = waffle.provider;

      const transferAmount = ethers.utils.parseEther("5");
      const data = { value: transferAmount };
      const transaction = await staking.connect(signer1).stakeEther(90, data);
      const receipt = transaction.wait();
      const block = await provider.getBlock(receipt.blockNumber);

      const position = await staking
        .connect(signer1.address)
        .getPositionById(0);

      expect(position.positionId).to.equal(0);
      expect(position.walletAddress).to.equal(signer1.address);
      expect(position.createdDate).to.equal(block.timestamp);
      expect(position.unlockDate).to.equal(block.timestamp + 86400 * 90);
      expect(position.percentInterest).to.equal(1200);
      expect(position.weiStaked).to.equal(transferAmount);
      expect(position.weiInterest).to.equal(
        ethers.BigNumber.from(transferAmount).mul(1200).div(10000)
      );
      expect(position.open).to.equal(true);
    });
  });
});
