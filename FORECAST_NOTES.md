# Forecast development notes

All tuning used the six supplied cases in chronological order. At each of the five transitions p00→p01 through p04→p05, a forecast was formed using only the earlier case's prices, then scored against the next case's first 240 future minutes for markets present in both cases. Pinball loss was averaged over market, minute and the five specified quantiles. These practice transitions are a small and changing sample, so the selected parameters are kept close to the established random-walk form.

## Iteration 0: starter

The fixed 0.0025 price-unit spread per square-root minute, centered on the last price, scored **0.00392518** in this walk-forward check.

## Iteration 1: recent market volatility

Replace the fixed spread with each market's root-mean-square one-minute price change over its most recent 120 intervals. This reflects the observed combination of long flat spells, candidate-specific activity, and occasional jumps. Scoring with no cross-market shrinkage was about **0.00371**; shrinking the local estimate 50% toward the median recent volatility across markets improved it to **0.00339663**. This was a substantial pooled improvement over the starter.

## Iteration 2: more robust event shrinkage (current)

Increase shrinkage of local volatility toward the event median from 50% to 60%. That reduces noisy estimates for thin or recently inactive markets while preserving some candidate-specific behavior. The same walk-forward check scored **0.00335764**, a modest further improvement. Larger shrinkage values sometimes did worse in the coarse grid, so the selected value is moderate. The forecast keeps a zero drift and square-root horizon widening; a tested 0.45 horizon exponent did not improve consistently and was dropped.

## Validation

Ran the program on all six complete practice inputs. Every output had exactly the input market IDs, 240 rows per market, five finite ordered quantiles in [0,1], and size below 1 MiB. A second run produced byte-identical outputs. The implementation is deterministic and processes the case in well under the 8-second limit on this workspace.
