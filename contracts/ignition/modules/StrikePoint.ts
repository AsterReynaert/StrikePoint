import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("StrikePointModule", (m) => {
  const priceMock = m.contract("MockPrice");
  const strikePoint = m.contract("StrikePoint", [priceMock]);
  return { priceMock, strikePoint };
});
