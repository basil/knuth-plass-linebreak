# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.2] - 2026-03-30

- Add `adjustmentRatioPenalty` option for custom looseness penalties

## [0.9.1] - 2026-03-29

- Use suffix-minimum floor for smarter overfull-line pruning

## [0.9.0] - 2026-03-28

- Rename package from `tex-linebreak` to `knuth-plass-linebreak`
- Migrate build and test tooling from webpack/karma to vite/vitest
- Exclude penalty width from `widthToNextBox` scan
- Return adjustment ratio 0 for exact-fit lines with rigid glue
- Require terminal forced break in `breakLines`
- Preserve fitness class nodes during line breaking

## [0.8.1] - 2025-08-04

- Limit an optimization to only apply when no items have negative widths,
  shrink or stretch -
  <https://github.com/robertknight/tex-linebreak/pull/105>

## [0.8.0] - 2025-08-02

- Support negative widths and stretchability/shrinkability (thanks @basil) -
   <https://github.com/robertknight/tex-linebreak/pull/103>

## [0.7.0] - 2024-01-15

- Add built-in type declarations (thanks @w8r) -
   <https://github.com/robertknight/tex-linebreak/pull/74>

## [0.6.0] - 2021-12-28

The package's code has been converted to ES 2017+. As such it no longer supports
IE 11 or other pre-2017 browsers.
