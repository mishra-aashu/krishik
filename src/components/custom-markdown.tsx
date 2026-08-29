import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CustomMarkdownProps {
  text: string;
}

export function CustomMarkdown({ text }: CustomMarkdownProps) {
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
    type: 'default' | 'small' | 'smallBold' | 'subtitle' = 'default',
    textStyle?: any
  ) => {
    const cleanedText = cleanCellText(lineText);
    const boldParts = cleanedText.split('**');

    return (
      <ThemedText key={keyPrefix} type={type} style={[styles.textLine, textStyle]}>
        {boldParts.map((boldPart, boldIndex) => {
          const isBold = boldIndex % 2 === 1;
          const italicParts = boldPart.split('*');

          return italicParts.map((italicPart, italicIndex) => {
            const isItalic = italicIndex % 2 === 1;
            const currentType = isBold ? (type === 'default' ? 'smallBold' : type) : type;

            return (
              <ThemedText
                key={`${keyPrefix}-b${boldIndex}-i${italicIndex}`}
                type={currentType}
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

  const renderTableRow = (cells: string[], rowIndex: number, isHeader: boolean, tableKey: string) => {
    return (
      <View
        key={`${tableKey}-row-${rowIndex}`}
        style={[
          styles.tableRow,
          { borderBottomColor: theme.border },
          isHeader
            ? { backgroundColor: theme.primary }
            : rowIndex % 2 === 0
            ? { backgroundColor: theme.card }
            : { backgroundColor: theme.backgroundElement },
        ]}
      >
        {cells.map((cell, colIndex) => {
          // Calculate individual column widths. Topic column is narrower, description columns are wider.
          const colWidth = colIndex === 0 ? 130 : 180;
          return (
            <View
              key={`${tableKey}-row-${rowIndex}-col-${colIndex}`}
              style={[
                styles.tableCell,
                { width: colWidth, borderRightColor: theme.border },
                colIndex === cells.length - 1 && { borderRightWidth: 0 },
              ]}
            >
              {renderInlineStyles(
                cell,
                `${tableKey}-row-${rowIndex}-cell-${colIndex}`,
                isHeader ? 'smallBold' : 'small',
                isHeader ? { color: '#ffffff' } : undefined
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderTable = (rows: string[][], tIdx: number) => {
    const tableKey = `table-${tIdx}`;
    const header = rows[0];
    const body = rows.slice(1);

    return (
      <View key={tableKey} style={styles.tableContainer}>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={styles.tableScrollView}>
          <View style={[styles.tableBlock, { borderColor: theme.border }]}>
            {renderTableRow(header, 0, true, tableKey)}
            {body.map((row, rIdx) => renderTableRow(row, rIdx + 1, false, tableKey))}
          </View>
        </ScrollView>
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
          <ThemedText style={[styles.bulletDot, { color: theme.primary }]}>•</ThemedText>
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
          <ThemedText style={[styles.bulletNumber, { color: theme.primary }]}>{num}.</ThemedText>
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
}

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
  textLine: {
    lineHeight: 22,
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
    fontSize: 16,
    lineHeight: 22,
  },
  bulletNumber: {
    marginRight: Spacing.two,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 22,
  },
  bulletTextContainer: {
    flex: 1,
  },
  paragraph: {
    marginVertical: Spacing.half,
  },
  // Table styles
  tableContainer: {
    marginVertical: Spacing.two,
    width: '100%',
  },
  tableScrollView: {
    width: '100%',
  },
  tableBlock: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableCell: {
    padding: Spacing.two,
    borderRightWidth: 1,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  blockquote: {
    borderLeftWidth: 4,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginVertical: Spacing.two,
    borderRadius: 4,
  },
});
