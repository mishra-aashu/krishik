import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CustomMarkdownProps {
  text: string;
}

export const CustomMarkdown = React.memo(function CustomMarkdown({ text }: CustomMarkdownProps) {
  if (!text) return null;
  const theme = useTheme();

  // Helper clean-up function to parse HTML elements commonly output by LLMs
  const cleanCellText = (txt: string) => {
    if (!txt) return '';
    return txt
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?ul>/gi, '')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/?[a-z][a-z0-9]*[^<>]*>/gi, '') // Strip remaining HTML tags
      .trim();
  };

  // Enhanced inline style parser supporting nested bold and italic tags
  const renderInlineStyles = (
    lineText: string,
    keyPrefix: string,
    type: 'default' | 'small' | 'smallBold' | 'subtitle' = 'small',
    textStyle?: any
  ) => {
    const cleanedText = cleanCellText(lineText);
    const boldParts = cleanedText.split('**');

    return (
      <ThemedText key={keyPrefix} type={type} style={textStyle}>
        {boldParts.map((boldPart, boldIndex) => {
          const isBold = boldIndex % 2 === 1;
          const italicParts = boldPart.split('*');

          return italicParts.map((italicPart, italicIndex) => {
            const isItalic = italicIndex % 2 === 1;

            return (
              <ThemedText
                key={`${keyPrefix}-b${boldIndex}-i${italicIndex}`}
                type="span"
                style={[
                  isBold && styles.boldText,
                  isItalic && styles.italicText,
                  isBold && { fontWeight: 'bold' },
                  isItalic && { fontStyle: 'italic' },
                ]}
              >
                {italicPart}
              </ThemedText>
            );
          });
        })}
      </ThemedText>
    );
  };

  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];

  let currentTableRows: string[][] = [];
  let tableIndex = 0;

  const flushTable = () => {
    if (currentTableRows.length > 0) {
      renderedElements.push(renderTable(currentTableRows, tableIndex++));
      currentTableRows = [];
    }
  };

  /**
   * Responsive table renderer — NO horizontal scroll.
   *
   * • 2-column table  → classic two-column layout (label left | value right),
   *   each row wraps naturally so no overflow.
   * • 3+ column table → each data row becomes a vertical card with labelled
   *   field pills, completely responsive on any screen width.
   */
  const renderTable = (rows: string[][], tIdx: number) => {
    const tableKey = `table-${tIdx}`;
    const headers = rows[0] ?? [];
    const body = rows.slice(1);

    // ── 2-column layout ───────────────────────────────────────────────────
    if (headers.length <= 2) {
      return (
        <View key={tableKey} style={[styles.tableContainer, { borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.twoColHeader, { backgroundColor: theme.primary }]}>
            {headers.map((h, hi) => (
              <View
                key={`${tableKey}-h-${hi}`}
                style={[
                  styles.twoColHeaderCell,
                  hi === 0 && styles.twoColLeftHeader,
                  hi > 0 && { borderLeftColor: 'rgba(255,255,255,0.3)', borderLeftWidth: 1 },
                ]}
              >
                {renderInlineStyles(h, `${tableKey}-htext-${hi}`, 'smallBold', { color: '#fff' })}
              </View>
            ))}
          </View>
          {/* Body rows */}
          {body.map((row, rIdx) => (
            <View
              key={`${tableKey}-r-${rIdx}`}
              style={[
                styles.twoColRow,
                {
                  borderTopColor: theme.border,
                  backgroundColor: rIdx % 2 === 0 ? theme.card : theme.backgroundElement,
                },
              ]}
            >
              <View style={[styles.twoColLeft, { borderRightColor: theme.border }]}>
                {renderInlineStyles(
                  row[0] ?? '',
                  `${tableKey}-r${rIdx}-c0`,
                  'smallBold',
                  { color: theme.primary }
                )}
              </View>
              <View style={styles.twoColRight}>
                {renderInlineStyles(row[1] ?? '', `${tableKey}-r${rIdx}-c1`, 'small')}
              </View>
            </View>
          ))}
        </View>
      );
    }

    // ── 3+ column: card-per-row layout ───────────────────────────────────
    return (
      <View key={tableKey} style={styles.cardTableContainer}>
        {body.map((row, rIdx) => (
          <View
            key={`${tableKey}-card-${rIdx}`}
            style={[
              styles.tableCard,
              { borderColor: theme.border, backgroundColor: theme.card },
            ]}
          >
            {headers.map((header, hi) => (
              <View key={`${tableKey}-card-${rIdx}-f-${hi}`} style={styles.tableCardField}>
                <View style={[styles.tableCardLabel, { backgroundColor: theme.primary + '22' }]}>
                  {renderInlineStyles(
                    header,
                    `${tableKey}-cl-${rIdx}-${hi}`,
                    'smallBold',
                    { color: theme.primary, fontSize: 11 }
                  )}
                </View>
                <View style={styles.tableCardValue}>
                  {renderInlineStyles(row[hi] ?? '—', `${tableKey}-cv-${rIdx}-${hi}`, 'small')}
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check if it's a table row
    if (trimmedLine.startsWith('|')) {
      // Check if it's a divider line like |---|---|
      const isDivider = trimmedLine.replace(/[\s|:-]/g, '') === '';
      if (isDivider) {
        continue;
      }

      const cells = trimmedLine.split('|').map((c) => c.trim());
      if (cells[0] === '') cells.shift();
      if (cells[cells.length - 1] === '') cells.pop();

      currentTableRows.push(cells);
      continue;
    }

    // Flush any pending tables when encountering a non-table line
    flushTable();

    // Skip empty lines but keep a small gap
    if (!trimmedLine) {
      renderedElements.push(<View key={`empty-${i}`} style={styles.spacing} />);
      continue;
    }

    // Blockquote
    if (trimmedLine.startsWith('>')) {
      const quoteText = trimmedLine.substring(1).trim();
      renderedElements.push(
        <View
          key={`quote-${i}`}
          style={[
            styles.blockquote,
            { borderLeftColor: theme.accent, backgroundColor: theme.backgroundElement },
          ]}
        >
          {renderInlineStyles(quoteText, `quote-text-${i}`, 'small', { fontStyle: 'italic' })}
        </View>
      );
      continue;
    }

    // Horizontal Rule
    if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
      renderedElements.push(
        <View key={`hr-${i}`} style={[styles.hr, { backgroundColor: theme.border }]} />
      );
      continue;
    }

    // Heading 3
    if (trimmedLine.startsWith('### ')) {
      renderedElements.push(
        <View key={`h3-${i}`} style={styles.headingContainer}>
          {renderInlineStyles(trimmedLine.substring(4), `h3-text-${i}`, 'smallBold', {
            fontSize: 17,
            color: theme.primary,
          })}
        </View>
      );
      continue;
    }

    // Heading 2 or Heading 1
    if (trimmedLine.startsWith('## ') || trimmedLine.startsWith('# ')) {
      const headingText = trimmedLine.startsWith('## ') ? trimmedLine.substring(3) : trimmedLine.substring(2);
      renderedElements.push(
        <View key={`h2-${i}`} style={styles.headingContainer}>
          {renderInlineStyles(headingText, `h2-text-${i}`, 'smallBold', {
            fontSize: 20,
            color: theme.primary,
          })}
        </View>
      );
      continue;
    }

    // Bullet list item
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
      const bulletText = trimmedLine.substring(2);
      renderedElements.push(
        <View key={`bullet-${i}`} style={styles.bulletRow}>
          <ThemedText type="small" style={[styles.bulletDot, { color: theme.primary }]}>•</ThemedText>
          <View style={styles.bulletTextContainer}>
            {renderInlineStyles(bulletText, `bullet-text-${i}`)}
          </View>
        </View>
      );
      continue;
    }

    // Numbered list item
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s(.*)/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const listText = numberedMatch[2];
      renderedElements.push(
        <View key={`num-${i}`} style={styles.bulletRow}>
          <ThemedText type="smallBold" style={[styles.bulletNumber, { color: theme.primary }]}>{num}.</ThemedText>
          <View style={styles.bulletTextContainer}>
            {renderInlineStyles(listText, `num-text-${i}`)}
          </View>
        </View>
      );
      continue;
    }

    // Standard paragraph line
    renderedElements.push(
      <View key={`p-${i}`} style={styles.paragraph}>
        {renderInlineStyles(trimmedLine, `p-text-${i}`)}
      </View>
    );
  }

  // Flush any final tables at the end of the text
  flushTable();

  return <View style={styles.container}>{renderedElements}</View>;
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  spacing: {
    height: Spacing.one,
  },
  hr: {
    height: 1,
    width: '100%',
    marginVertical: Spacing.three,
  },
  headingContainer: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
    paddingBottom: Spacing.half,
  },
  boldText: {
    fontWeight: 'bold',
  },
  italicText: {
    fontStyle: 'italic',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: Spacing.half,
    paddingLeft: Spacing.one,
  },
  bulletDot: {
    marginRight: Spacing.two,
  },
  bulletNumber: {
    marginRight: Spacing.two,
  },
  bulletTextContainer: {
    flex: 1,
  },
  paragraph: {
    marginVertical: Spacing.half,
  },

  // ── 2-column table ──────────────────────────────────────────────────────
  tableContainer: {
    marginVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
  },
  twoColHeader: {
    flexDirection: 'row',
  },
  twoColHeaderCell: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  twoColLeftHeader: {
    flex: 0.9,
  },
  twoColRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    minHeight: 40,
  },
  twoColLeft: {
    flex: 0.9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRightWidth: 1,
    justifyContent: 'center',
  },
  twoColRight: {
    flex: 1.1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },

  // ── 3+ column card layout ───────────────────────────────────────────────
  cardTableContainer: {
    marginVertical: Spacing.two,
    gap: 8,
  },
  tableCard: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    padding: 10,
    gap: 6,
  },
  tableCardField: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  tableCardLabel: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
    maxWidth: '45%',
  },
  tableCardValue: {
    flex: 1,
    minWidth: 100,
  },

  blockquote: {
    borderLeftWidth: 4,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginVertical: Spacing.two,
    borderRadius: 4,
  },
});
