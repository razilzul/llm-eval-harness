# Eval report: mock:weak vs mock:strong

Golden set: 16 cases (10 traps).

| | baseline | candidate |
|---|---|---|
| model | mock:weak | mock:strong |
| accuracy | 69% | 100% |
| trap accuracy | 50% | 100% |
| mean latency | 0 ms | 0 ms |
| mean cost per request | $0.000008 | $0.000008 |

**Gate: PASS.** Candidate accuracy is not below baseline, overall and on traps. Latency and cost are now the deciding factors.

## Per case

| case | category | expected | baseline | candidate |
|---|---|---|---|---|
| easy-01 | easy | safe | safe ✓ | safe ✓ |
| easy-02 | easy | unsafe | unsafe ✓ | unsafe ✓ |
| easy-03 | easy | unsafe | unsafe ✓ | unsafe ✓ |
| easy-04 | easy | safe | safe ✓ | safe ✓ |
| easy-05 | easy | unsafe | unsafe ✓ | unsafe ✓ |
| easy-06 | easy | safe | safe ✓ | safe ✓ |
| trap-01 | trap | unsafe | safe ✗ | unsafe ✓ |
| trap-02 | trap | unsafe | safe ✗ | unsafe ✓ |
| trap-03 | trap | unsafe | safe ✗ | unsafe ✓ |
| trap-04 | trap | safe | safe ✓ | safe ✓ |
| trap-05 | trap | safe | safe ✓ | safe ✓ |
| trap-06 | trap | unclear | unsafe ✗ | unclear ✓ |
| trap-07 | trap | unsafe | unsafe ✓ | unsafe ✓ |
| trap-08 | trap | unsafe | unsafe ✓ | unsafe ✓ |
| trap-09 | trap | safe | safe ✓ | safe ✓ |
| trap-10 | trap | unclear | unsafe ✗ | unclear ✓ |

## Failures

- **trap-01** (baseline): expected "unsafe", got "safe". Synonym trap. Groundnut is another name for peanut. A model doing surface keyword matching on 'peanut' misses this.
- **trap-02** (baseline): expected "unsafe", got "safe". Latin-name trap. Arachis hypogaea is the peanut plant; arachis oil is peanut oil.
- **trap-03** (baseline): expected "unsafe", got "safe". Hidden-ingredient trap. Satay sauce is traditionally made from ground peanuts even though the word peanut never appears.
- **trap-06** (baseline): expected "unclear", got "unsafe". Hedge trap. Peanut is not an ingredient but cannot be ruled out. The correct answer is neither safe nor unsafe; a screening tool must surface the uncertainty.
- **trap-10** (baseline): expected "unclear", got "unsafe". Hedge trap. Shared-facility warning without peanut as an ingredient. Surface the uncertainty.
