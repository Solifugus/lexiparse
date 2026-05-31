# Examples

This directory contains demonstration and example code for the Lexiparse Enterprise Business DSL Platform.

## Files

### `coreds.js` ⭐ NEW
**CoreDS** - Core Domain Specific Language foundation:
- Clean, extensible starter language for any business domain
- Natural business syntax with money, dates, percentages
- Comprehensive standard library (math, text, dates, validation)
- Powerful extension system for domain-specific customization
- Production-ready with full lexiparse enterprise features
- Ready-to-extend for Healthcare, Finance, Inventory, HR, etc.

📚 **[Complete Tutorial: CoreDS_Tutorial.md](CoreDS_Tutorial.md)** - Comprehensive guide to building domain-specific languages with CoreDS

### `domain_extension_demo.js` ⭐ NEW
**Domain Extension Examples** - Practical demonstrations of extending CoreDS:
- E-commerce DSL with shipping, discounts, and loyalty calculations
- HR/Payroll DSL with benefits, overtime, and performance management
- Finance DSL with loans, investments, and amortization schedules
- Shows real-world business scenarios and calculations
- Demonstrates best practices for domain-specific extensions

### `bizscript_demo.js`
Comprehensive demonstration of BizScript language features including:
- Business logic syntax and expressions
- Control flow (if/else, loops)
- Function definitions and calls
- Data structures (objects, arrays)
- Real-world business scenarios

### `error_demo.js`
Interactive demonstration of the enhanced error reporting system:
- Business-friendly error messages
- Contextual suggestions and corrections
- Recovery mechanisms
- Error handling best practices

## Running Examples

```bash
# Run the CoreDS foundation language (recommended starting point)
node examples/coreds.js

# Run domain extension examples (E-commerce, HR, Finance)
node examples/domain_extension_demo.js

# Run the main BizScript demonstration
node examples/bizscript_demo.js

# Run the error handling demonstration
node examples/error_demo.js

# Run all examples
npm run test:examples
```

## Business Use Cases

These examples showcase how business users can:

### CoreDS Foundation
- Start with a clean, extensible business language core
- Extend for any domain: Healthcare, Finance, Inventory, HR
- Use natural syntax for common business operations
- Leverage comprehensive standard library functions

### Advanced Features  
- Write readable business logic in natural syntax
- Handle complex calculations and workflows
- Implement business rules and validations
- Debug and troubleshoot their logic effectively

For comprehensive testing and validation, see the `../tests/` directory.