# Network Map (180p) - Structural Sketch

This document maps the "entanglement" between Meow's core components to facilitate network-threaded evolution.

## 1. Moving Parts (The Qubits)

| Qubit | File | Responsibility | Entanglement (Dependencies) |
| :--- | :--- | :--- | :--- |
| **Q1: Kernel** | `src/core/lean-agent.ts` | Orchestrates T-D-A loop | Q2, Q3, Q5 |
| **Q2: Tools** | `src/sidecars/tool-registry.ts` | Provides capabilities | Q1, Q4 |
| **Q3: Skills** | `src/skills/` | High-level logic | Q1, Q2 |
| **Q4: MCP** | `src/sidecars/mcp-client.ts` | External tool bridge | Q2 |
| **Q5: Evolve** | `src/tools/evolve.ts` | Self-improvement loop | Q1, Q2, Q3, Q6 |
| **Q6: Harness**| `agent-harness/jobs/` | Distributed execution | Q5 |

## 2. Entanglement Matrix (Interaction Strengths)

| | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 |
| :--- | :--: | :--: | :--: | :--: | :--: | :--: |
| **Q1** | - | HI | HI | LO | ME | LO |
| **Q2** | HI | - | ME | HI | HI | LO |
| **Q3** | HI | ME | - | LO | ME | LO |
| **Q4** | LO | HI | LO | - | LO | LO |
| **Q5** | ME | HI | ME | LO | - | HI |
| **Q6** | LO | LO | LO | LO | HI | - |

**Legend:**
- **HI (Strong)**: Changing one breaks the other immediately.
- **ME (Medium)**: Functional dependency, but modular.
- **LO (Weak)**: Minimal interaction.

## 3. Potential Interference Patterns

1. **Protocol Shift (Q1 <-> Q4)**: If we change the core messaging protocol to support "multi-threaded" quantum reasoning, the MCP bridge (Q4) may lose context synchronization.
2. **Skill Distillation (Q3 <-> Q5)**: If the evolution loop (Q5) harvests a skill that conflicts with an existing one in Q3, we get "Superposition Conflict" where two tools claim the same intent.
3. **Budget Exhaustion (Q5 <-> Q6)**: Parallel research loops in the harness (Q6) can exponentially drain the session budget (MAX_BUDGET_USD) if not throttled by a global "Quantum Observer".

## 4. Path to 360p

To reach 360p resolution, we must simulate a code change that affects BOTH Q1 (Kernel) and Q5 (Evolve) simultaneously, ensuring they remain in phase.
