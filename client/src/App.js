import "./App.css";
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import artifact from "./artifacts/contracts/Staking.sol/Staking.json";
//import { toString, toWei, toEther } from "./helper/helper";

import NavBar from "./components/NavBar";
import StakeModal from './components/StakeModal'
import { Coin, PiggyBank, Bank } from "react-bootstrap-icons";

const CONTRACT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";

function App() {
  // general
  const [provider, setProvider] = useState(undefined);
  const [signer, setSigner] = useState(undefined);
  const [contract, setContract] = useState(undefined);
  const [signerAddress, setSignerAddress] = useState(undefined);

  // assets/providers
  const [assetIds, setAssetIds] = useState([]);
  const [assets, setAssets] = useState([]);

  // staking
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [stakingLength, setStakingLength] = useState(undefined);
  const [stakingPercent, setStakingPercent] = useState(undefined);
  const [amount, setAmount] = useState(0);

  // helper functions
  // call them from a file when need them



  const toWei = ether => ethers.utils.parseEther(ether)
  const toEther = wei => ethers.utils.formatEther(wei)

  useEffect(() => {
    // run when the page loads
    const onLoad = async () => {
      const provider = await new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);

      const contract = await new ethers.Contract(
        CONTRACT_ADDRESS,
        artifact.abi
      );
      setContract(contract);
    };
    onLoad();
  }, []);

  const isConnected = () => signer !== undefined;

  const getSigner = async () => {
    provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    return signer;
  };

  const getAssetIds = async (address, signer) => {
    const assetIds = await contract
      .connect(signer)
      .getPositionIdsForAddress(address);
    return assetIds;
  };

  const calculateDaysRemaining = (unlockDate) => {
    const timeNow = Date.now() / 1000;
    const secondsRemaining = unlockDate - timeNow;
    return Math.max((secondsRemaining / 60 / 60 / 24).toFixed(0), 0);
  };

  const getAssets = async (ids, signer) => {
    const queriedAssets = await Promise.all(
      ids.map((id) => contract.connect(signer).getPositionById(id))
    );

    queriedAssets.map(async (asset) => {
      const parsedAsset = {
        positionId: asset.positionId,
        percentInterest: Number(asset.percentInterest) / 100,
        daysRemaining: calculateDaysRemaining(Number(asset.unlockDate)),
        etherInterest: toEther(asset.weiInterest),
        etherStaked: toEther(asset.weiStaked),
        open: asset.open,
      };

      setAssets((prev) => [...prev, parsedAsset]);
    });
  };

  const connectAndLoad = async () => {
    const signer = await getSigner(provider);
    setSigner(signer);

    const signerAddress = await signer.getAddress();
    setSignerAddress(signerAddress);

    const assetIds = await getAssetIds(signerAddress, signer);
    setAssetIds(assetIds);

    getAssetIds(assetIds, signer);
  };

  const openStakingModal = (stakingLength, stakingPercent) => {
    setShowStakeModal(true);
    setStakingLength(stakingLength);
    setStakingPercent(stakingPercent);
  };

  const stakeEther = () => {
    const wei = toWei(amount);
    const data = { value: wei };
    contract.connect(signer).stakeEther(stakingLength, data);
  };

  const withdraw = (positionId) => {
    contract.connect(signer).closePosition(positionId);
  };

  return (
    <div className="App">
      <div>
        <NavBar isConnected={isConnected} connect={connectAndLoad} />
      </div>

      <div className="appBody">
        <div className="marketContainer">
          <div className="subContainer">
            <span>
              <img className="logoImg"></img>
            </span>
            <span className="marketHeader">Ethereum Market</span>
          </div>

          <div className="row">
            <div className="col-md-4">
              <div
                onClick={() => openStakingModal(30, "7%")}
                className="marketOption"
              >
                <div className="glyphContainer hoverButton">
                  <span className="glyph">
                    <Coin />
                  </span>
                </div>
                <div className="optionData">
                  <span>10 days</span>
                  <span className="optionPercent">7%</span>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div
                onClick={() => openStakingModal(30, "9%")}
                className="marketOption"
              >
                <div className="glyphContainer hoverButton">
                  <span className="glyph">
                    <Coin />
                  </span>
                </div>
                <div className="optionData">
                  <span>1 month</span>
                  <span className="optionPercent">9%</span>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div
                onClick={() => openStakingModal(90, "12%")}
                className="marketOption"
              >
                <div className="glyphContainer hoverButton">
                  <span className="glyph">
                    <Coin />
                  </span>
                </div>
                <div className="optionData">
                  <span>90 days</span>
                  <span className="optionPercent">12%</span>
                </div>
              </div>
            </div>

            <div className="assetContainer">
              <div className="subContainer">
                <span className="marketHeader">Staked Assets</span>
              </div>
              <div>
                <div className="row columnHeaders">
                  <div className="col-md-2">Assets</div>
                  <div className="col-md-2">Percent Interest</div>
                  <div className="col-md-2">Staked</div>
                  <div className="col-md-2">Interest</div>
                  <div className="col-md-2"></div>
                </div>
              </div>
              <br />

              <div className="assetContainer">
                <div className="subContainer">
                  <span className="marketHeader">Staked Assets</span>
                </div>
                <div>
                  <div className="row columnHeaders">
                    <div className="col-md-2">Assets</div>
                    <div className="col-md-2">Percent Interest</div>
                    <div className="col-md-2">Staked</div>
                    <div className="col-md-2">Interest</div>
                    <div className="col-md-2">Days Remaining</div>
                    <div className="col-md-2"></div>
                  </div>
                </div>
                <br />
                {assets.length > 0 &&
                  assets.map((a, idx) => (
                    <div className="row">
                      <div className="col-md-2">
                        <span>
                          <img className="stakedLogoImg" src="eth-logo.webp" />
                        </span>
                      </div>
                      <div className="col-md-2">{a.percentInterest} %</div>
                      <div className="col-md-2">{a.etherStaked}</div>
                      <div className="col-md-2">{a.etherInterest}</div>
                      <div className="col-md-2">{a.daysRemaining}</div>
                      <div className="col-md-2">
                        {a.open ? (
                          <div
                            onClick={() => withdraw(a.positionId)}
                            className="orangeMiniButton"
                          >
                            Withdraw
                          </div>
                        ) : (
                          <span>closed</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            {showStakeModal && (
              <StakeModal
                onClose={() => setShowStakeModal(false)}
                stakingLength={stakingLength}
                stakingPercent={stakingPercent}
                amount={amount}
                setAmount={setAmount}
                stakeEther={stakeEther}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
