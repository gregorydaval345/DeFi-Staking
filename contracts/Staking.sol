// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.9;

contract Staking {
    address public owner;

    struct Position {
        uint positionId;
        address walletAddress;
        uint createdDate;
        uint unlockDate; // date at which funds can be withdrawn with penalty
        uint percentInterest;
        uint weiStaked; 
        uint weiInterest ; // amount of interest user will earn when position is unlocked
        bool open; // if position is closed or not
    }

    Position position;

    uint public currentPositionId;
    mapping(uint => Position) public positions;
    mapping(address => uint[]) public positionIdsByAddress; // gives the ability for a user to query all the positions that they have created
    mapping(uint => uint) public numberOfDaysWithInterest; // basically tiers
    uint[] public lockPeriods; // different lock periods

    constructor() payable {
        // payable because it allows the deployer of this contract to send some ether to it when its being deployed
        owner = msg.sender;
        currentPositionId = 0;

        // How much they would earn if they kept it locked in - apy
        numberOfDaysWithInterest[10] = 700; // 10 days at 7% apy
        numberOfDaysWithInterest[30] = 900; // 30 days at 9% apy
        numberOfDaysWithInterest[90] = 1200; // 90 days at 12% apy

        lockPeriods.push(10);
        lockPeriods.push(30);
        lockPeriods.push(90);
    }

    function stakeEther(uint numDays) external payable {
        require(numberOfDaysWithInterest[numDays] > 0, "Mapping not found");

        positions[currentPositionId] = Position(
            currentPositionId,
            msg.sender,
            block.timestamp,
            block.timestamp + (numDays * 1 days),
            numberOfDaysWithInterest[numDays],
            msg.value,
            calculateInterest(numberOfDaysWithInterest[numDays], numDays, msg.value),
            true
        );

        positionIdsByAddress[msg.sender].push(currentPositionId);
        currentPositionId += 1;
    }

    function calculateInterest(uint basisPoints, uint numDays, uint weiAmount) private pure returns(uint) {
        return (basisPoints * weiAmount) / 10000; // 700  * weiAmount / 10000 => 0.07
    }

    function modifyLockPeriods(uint numDays, uint basisPoints) external {
        require(owner == msg.sender, "Only owner may modify staking periods");

        numberOfDaysWithInterest[numDays] = basisPoints;
        lockPeriods.push(numDays);
    }

    function getLockPeriods() external view returns(uint[] memory) {
        return lockPeriods;
    }

    function getInterestRate(uint numDays) external view returns(uint) {
        return numberOfDaysWithInterest[numDays];
    }

    function getPositionById(uint positionId) external view returns(Position memory) {
        return positions[positionId];
    }

    function getPositionIdsForAddres(address walletAddress) external view returns(uint[] memory) {
        return positionIdsByAddress[walletAddress];
    }

    function changeUnlockDateForPosition(uint positionId, uint newUnlockDate) external {
        require(owner == msg.sender, "Only owner may modify unlock dates");

        positions[positionId].unlockDate = newUnlockDate;
    }

    // unstake 
    function closePosition(uint positionId) external {
        require(positions[positionId].walletAddress == msg.sender, "Only position creator may modify position");
        require(positions[positionId].open == true, "Position is closed");

        positions[positionId].open = false;

        if (block.timestamp > positions[positionId].unlockDate) {
            uint amount = positions[positionId].weiStaked + positions[positionId].weiInterest;
            payable(msg.sender).call{value: amount}("");
        } else {
            payable(msg.sender).call{value: positions[positionId].weiStaked}("");
        }
    }
}