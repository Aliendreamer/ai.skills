## ADDED Requirements

### Requirement: Parse an in-memory catalog
The system SHALL provide `parseCatalog(data)` that validates an already-parsed catalog value
(e.g. fetched over HTTP) and returns a typed `Catalog`, throwing on structural problems. The
existing `loadCatalog(file)` SHALL be defined in terms of `parseCatalog` so file and network
sources share one validation path.

#### Scenario: Parse a valid in-memory catalog
- **WHEN** `parseCatalog` is given an object with a valid `entries` array
- **THEN** it returns the typed `Catalog`

#### Scenario: Reject an invalid in-memory catalog
- **WHEN** `parseCatalog` is given a value whose entries fail validation
- **THEN** it throws rather than returning a partial catalog
