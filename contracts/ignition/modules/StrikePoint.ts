// ignition/modules/StrikePoint.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("StrikePointModule", (m) => {
  // Deploy StrikePoint with no constructor arguments
  const strikePoint = m.contract("StrikePoint");

  return { strikePoint };
});