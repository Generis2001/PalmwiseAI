export const palmWiseAbi = [
  {
    type: "function",
    name: "submitReading",
    inputs: [{ name: "llmInput", type: "bytes" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getReadings",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "readingHash", type: "bytes32" },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasPending",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "readingOwner",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ReadingCreated",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "readingHash", type: "bytes32", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export const ritualWalletAbi = [
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "lockDuration", type: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lockUntil",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const asyncJobTrackerAbi = [
  {
    type: "function",
    name: "hasPendingJobForSender",
    inputs: [{ name: "sender", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "JobAdded",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "jobId", type: "bytes32", indexed: true },
    ],
  },
  {
    type: "event",
    name: "Phase1Settled",
    inputs: [
      { name: "jobId", type: "bytes32", indexed: true },
    ],
  },
  {
    type: "event",
    name: "ResultDelivered",
    inputs: [
      { name: "jobId", type: "bytes32", indexed: true },
      { name: "success", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "JobRemoved",
    inputs: [
      { name: "jobId", type: "bytes32", indexed: true },
      { name: "completed", type: "bool", indexed: false },
    ],
  },
] as const;

export const teeRegistryAbi = [
  {
    type: "function",
    name: "getExecutorPublicKey",
    inputs: [{ name: "executorId", type: "address" }],
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getActiveExecutors",
    inputs: [{ name: "capability", type: "uint8" }],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    // getServicesByCapability(uint8 capability, bool activeOnly)
    // Returns array of ServiceInfo structs. Each has a nested NodeInfo:
    //   services[i].node.teeAddress  — executor address for the LLM precompile
    //   services[i].node.publicKey   — 65-byte uncompressed secp256k1 key
    type: "function",
    name: "getServicesByCapability",
    inputs: [
      { name: "capability", type: "uint8" },
      { name: "activeOnly", type: "bool" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          {
            name: "node",
            type: "tuple",
            components: [
              { name: "teeAddress", type: "address" },
              { name: "publicKey", type: "bytes" },
              { name: "enodeUrl", type: "string" },
              { name: "walletAddress", type: "address" },
              { name: "isActive", type: "bool" },
            ],
          },
          { name: "capabilities", type: "uint8[]" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;
