# Polaris Theme Test

This document tests **markdown** syntax highlighting in the Polaris theme.

## Features

- **Dark and Light variants** with professional color schemes
- *Syntax highlighting* for multiple languages
- `Inline code` with proper contrast
- [External links](https://example.com) and internal references

### Code Blocks

Here's some JavaScript:

```javascript
const greeting = "Hello, World!";
console.log(greeting);

function calculateSum(a, b) {
  return a + b;
}
```

And some Python:

```python
def fibonacci(n):
    """Generate fibonacci sequence up to n"""
    a, b = 0, 1
    while a < n:
        yield a
        a, b = b, a + b

# Usage example
for num in fibonacci(100):
    print(num)
```

### Lists and Tasks

**Numbered list:**
1. First item
2. Second item
3. Third item

**Bullet points:**
- Item A
- Item B  
- Item C

**Task list:**
- [x] Completed task
- [ ] Pending task
- [ ] Another pending task

### Tables

| Language   | Extension | Syntax Highlighting |
|------------|-----------|-------------------|
| JavaScript | `.js`     | ✅ Full support    |
| Python     | `.py`     | ✅ Full support    |
| Go         | `.go`     | ✅ Full support    |
| JSON       | `.json`   | ✅ Full support    |

### Quotes and Emphasis

> "The best themes are invisible until you need them to be visible."
> 
> — Theme Design Philosophy

**Bold text** and *italic text* should have clear contrast.

***Bold italic text*** should combine both styles effectively.

### Inline Elements

Here are some inline elements:
- Inline `code snippets` with backticks
- **Important bold text** for emphasis  
- *Subtle italic text* for notes
- ~~Strikethrough text~~ for corrections
- Regular text for normal content

### Code Fence Examples

HTML:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test Page</title>
</head>
<body>
    <h1 class="main-title">Hello World</h1>
    <p id="content">This is a test paragraph.</p>
</body>
</html>
```

CSS:
```css
.main-title {
    color: #333;
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 1rem;
}

#content {
    line-height: 1.6;
    padding: 1rem;
    background-color: #f5f5f5;
    border-left: 4px solid #007acc;
}
```

---

## Testing Notes

This document should display:
- Clear hierarchy with headings
- Proper contrast for all text elements  
- Distinguishable code blocks and inline code
- Readable link colors
- Appropriate emphasis styling

**Theme Status:** ✅ Ready for testing