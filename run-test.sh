#!/bin/bash
cd C:/Users/stanc/github/meow-1/packages/harness
bun run test-gateway-live.ts > test-output.txt 2>&1
echo "EXIT: $?" >> test-output.txt