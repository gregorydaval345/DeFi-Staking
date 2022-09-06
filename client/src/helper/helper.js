import { ethers } from "ethers";
import React from "react";

function toString() {
  const toString = (byte32) => ethers.utils.parseBytes32String(byte32);
  return toString;
}

function toWei() {
  const toWei = (ether) => ethers.utils.parseEther(ether);
  return toWei;
}

function toEther() {
  const toEther = (wei) => ethers.utils.parseEther(wei);
  return toEther;
}

export { toString, toWei, toEther };
