# Markdown

This is a sample document showcasing **every common Markdown feature**. Edit it, pick a theme, then hit **Copy HTML** to paste into your editor, doc, or wherever you need styled content.

---

## Text Formatting

This is a regular paragraph. You can make text **bold**, *italic*, or ***bold and italic***. You can also use ~~strikethrough~~ for deleted text and `inline code` for technical terms.

Here's a second paragraph to show spacing. Links work too: visit the [Markdown Guide](https://www.markdownguide.org/) or check out [GitHub](https://github.com).

---

## Headings

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

---

## Lists

### Unordered

- Item one
- Item two
  - Nested item A
  - Nested item B
    - Deeply nested
- Item three

### Ordered

1. First step
2. Second step
   1. Sub-step 2a
   2. Sub-step 2b
3. Third step

### Mixed

1. Get the ingredients
   - Flour
   - Sugar
   - Eggs
2. Mix them together
3. Bake at 350°F

---

## Blockquotes

> This is a simple blockquote.

> **Nested blockquotes** work too:
>
> > "The best way to predict the future is to invent it."
> > — Alan Kay
>
> Back to the outer level.

---

## Code

Inline: use `console.log()` or reference a `variable` in a sentence.

Block with syntax highlighting:

```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55
```

```python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
```

```css
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}
```

A plain code block (no language):

```
WARN  2026-03-04 12:00:00 - Connection timeout, retrying...
INFO  2026-03-04 12:00:01 - Reconnected successfully
```

---

## Tables

| Feature          | Status | Notes                        |
|------------------|--------|------------------------------|
| Preset themes    | Done   | Minimal, Professional, Dark, Warm |
| Theme Maker      | Done   | Color pickers + live preview |
| Copy HTML        | Done   | Inlined CSS for portability |
| Share style      | Done   | URL-encoded, no server needed |
| Share doc        | Done   | Full doc + style in one link |

### Right-aligned columns

| Metric       | Q1     | Q2     | Q3     | Q4     |
|--------------|-------:|-------:|-------:|-------:|
| Revenue      | $120k  | $145k  | $162k  | $198k  |
| Users        | 1,200  | 1,850  | 2,400  | 3,100  |
| Churn rate   | 5.2%   | 4.8%   | 3.9%   | 3.1%   |

---

## Horizontal Rules

Use `---`, `***`, or `___` to create dividers:

---

***

___

---

## Images

Images render inline (if your markdown includes any):

![Placeholder](https://via.placeholder.com/600x200/e2e8f0/475569?text=Sample+Image)

---

## Links

- [Basic link](https://example.com)
- [Link with title](https://example.com "Hover to see this title")
- Autolinked URL: https://example.com

---

## Emphasis & Special Characters

Quotes: "curly" and 'single curly'

Em dash — and en dash –

Ellipsis...

Special characters: &copy; &amp; &lt; &gt; 5 &times; 10 = 50

---

## Nested Content

> **Pro tip:** You can nest just about anything inside a blockquote:
>
> 1. Ordered lists
> 2. With **bold** and *italic* text
>    - And sub-items
>
> ```
> Even code blocks
> ```
>
> And tables:
>
> | A | B |
> |---|---|
> | 1 | 2 |

---

## Long Paragraph

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula.

---

*Replace this with your own content and start sharing.*
