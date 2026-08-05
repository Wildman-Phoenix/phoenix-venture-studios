"use strict";

const Module = require("node:module");

const originalLoad = Module._load;

Module._load = function loadWithRollupWasm(request, parent, isMain) {
  if (
    typeof request === "string" &&
    request.startsWith("@rollup/rollup-") &&
    request !== "@rollup/wasm-node"
  ) {
    return originalLoad.call(
      this,
      "@rollup/wasm-node/dist/native.js",
      parent,
      isMain,
    );
  }

  return originalLoad.call(this, request, parent, isMain);
};
