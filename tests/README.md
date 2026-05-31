# Tests

This directory contains comprehensive test suites for all phases of the Lexiparse Enterprise Business DSL Platform.

## Test Suites

### Phase-Specific Tests

- **`phase2_test.js`** - Basic Phase 2 functionality tests
- **`phase2_comprehensive_test.js`** - Comprehensive Phase 2 data structures and integration tests  
- **`phase3_production_test.js`** - Phase 3 enterprise production features tests
- **`phase4_developer_experience_test.js`** - Phase 4 developer tools and productivity features tests

### Feature-Specific Tests

- **`scoping_test.js`** - Variable scoping and scope management tests
- **`scoping_basic_test.js`** - Basic scoping functionality tests
- **`external_test.js`** - External function integration and API tests
- **`string_test.js`** - String manipulation and processing tests
- **`date_test.js`** - Date/time handling and business date calculations tests

### Integration Tests

- **`enterprise_integration_test.js`** - Full enterprise platform integration tests

## Running Tests

### Individual Test Suites
```bash
# Run specific phase tests
node tests/phase4_developer_experience_test.js
node tests/phase3_production_test.js
node tests/phase2_comprehensive_test.js

# Run feature-specific tests
node tests/scoping_test.js
node tests/external_test.js
node tests/string_test.js
node tests/date_test.js

# Run enterprise integration tests
node tests/enterprise_integration_test.js
```

### Batch Testing
```bash
# Run all tests in sequence
for test in tests/*.js; do
    echo "Running $test..."
    node "$test"
done
```

## Test Coverage

The test suites validate:

### Core Language Features
- Operator precedence and expression parsing
- Control flow (if/else, loops)
- Function definitions and calls
- Variable scoping and management

### Data Structures & Integration  
- Arrays and objects
- String manipulation
- Date/time operations
- External function integration
- File I/O operations

### Production Features
- Security and sandboxing
- Performance optimization
- Module system
- Standard library functions
- Memory management
- Configuration system

### Developer Experience
- Enhanced error messages
- Debugging support (breakpoints, watch variables)
- Testing framework
- Documentation generation  
- Syntax highlighting
- Interactive REPL

## Business Scenarios

Tests include real-world business scenarios:
- Insurance claim processing
- Healthcare billing calculations
- Financial rule validation
- Workflow automation
- Configuration management

Each test suite demonstrates production-ready enterprise capabilities suitable for business users and IT deployment teams.