import React from 'react';
import { View, StyleSheet, Linking, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CustomMarkdownProps {
  text: string;
}

export const CustomMarkdown = React.memo(function CustomMarkdown({ text }: CustomMarkdownProps) {
  if (!text) return null;
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 600;

  // ── Helpers ─────────────────────────────────────────────────────────────
  const cleanCellText = (txt: string) => {
    if (!txt) return '';
    return txt
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?ul>/gi, '')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/?[a-z][a-z0-9]*[^<>]*>/gi, '')
      .trim();
  };

  // ── Inline Style Parser (bold, italic, code, links) ─────────────────────
  const renderInlineStyles = (
    lineText: string,
    keyPrefix: string,
    type: 'default' | 'small' | 'smallBold' | 'subtitle' = 'small',
    textStyle?: any
  ) => {
    const cleanedText = cleanCellText(lineText);

    // Tokenize using regex matching across all characters (including newlines):
    // ***bold-italic***, **bold**, *italic*, `code`, [link](url)
    const tokenRegex = /(\*\*\*([\s\S]+?)\*\*\*|\*\*([\s\S]+?)\*\*|\*([\s\S]+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;

    const tokens: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let tokenIdx = 0;

    while ((match = tokenRegex.exec(cleanedText)) !== null) {
      // Push plain text before this match
      if (match.index > lastIndex) {
        const plainPart = cleanedText.slice(lastIndex, match.index).replace(/\*\*/g, '');
        if (plainPart) {
          tokens.push(
            <ThemedText key={`${keyPrefix}-t${tokenIdx++}`} type="span">
              {plainPart}
            </ThemedText>
          );
        }
      }

      if (match[2] !== undefined) {
        // ***bold italic***
        tokens.push(
          <ThemedText
            key={`${keyPrefix}-t${tokenIdx++}`}
            type="span"
            style={{ fontWeight: '800', fontStyle: 'italic' }}
          >
            {match[2].replace(/\*\*/g, '')}
          </ThemedText>
        );
      } else if (match[3] !== undefined) {
        // **bold**
        tokens.push(
          <ThemedText
            key={`${keyPrefix}-t${tokenIdx++}`}
            type="span"
            style={{ fontWeight: '800' }}
          >
            {match[3].replace(/\*\*/g, '')}
          </ThemedText>
        );
      } else if (match[4] !== undefined) {
        // *italic*
        tokens.push(
          <ThemedText
            key={`${keyPrefix}-t${tokenIdx++}`}
            type="span"
            style={{ fontStyle: 'italic' }}
          >
            {match[4].replace(/\*\*/g, '')}
          </ThemedText>
        );
      } else if (match[5] !== undefined) {
        // `code`
        tokens.push(
          <ThemedText
            key={`${keyPrefix}-t${tokenIdx++}`}
            type="span"
            style={[styles.codeInlineText, { color: theme.primary, backgroundColor: theme.primary + '14' }]}
          >
            {match[5]}
          </ThemedText>
        );
      } else if (match[6] !== undefined && match[7] !== undefined) {
        // [link](url)
        tokens.push(
          <ThemedText
            key={`${keyPrefix}-t${tokenIdx++}`}
            type="span"
            style={[styles.linkText, { color: theme.primary }]}
            onPress={() => Linking.openURL(match![7])}
          >
            {match[6]}
          </ThemedText>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Push remaining plain text
    if (lastIndex < cleanedText.length) {
      const remainingPart = cleanedText.slice(lastIndex).replace(/\*\*/g, '');
      if (remainingPart) {
        tokens.push(
          <ThemedText key={`${keyPrefix}-t${tokenIdx++}`} type="span">
            {remainingPart}
          </ThemedText>
        );
      }
    }

    // If no tokens found, render as plain text without **
    if (tokens.length === 0) {
      return (
        <ThemedText key={keyPrefix} type={type} style={textStyle}>
          {cleanedText.replace(/\*\*/g, '')}
        </ThemedText>
      );
    }

    return (
      <ThemedText key={keyPrefix} type={type} style={textStyle}>
        {tokens}
      </ThemedText>
    );
  };

  // ── Step & Number Extractor for Table Cells ────────────────────────────
  const extractStepInfo = (line: string): { isStep: boolean; stepNum?: string; text?: string } => {
    const trimmed = line.trim();
    if (!trimmed) return { isStep: false };

    // Matches: 1., 1), [1], (1), 1️⃣ to 🔟, ① to ⑩
    const match = trimmed.match(/^(?:(\d{1,2})[\.\)]|\[(\d{1,2})\]|\((\d{1,2})\)|([1-9]️⃣|10️⃣)|([①-⑩]))\s*(.*)/);
    if (match) {
      const rawNum = match[1] || match[2] || match[3] || (match[4] ? match[4].replace(/[^\d]/g, '') : '') || match[5] || '1';
      const restText = match[6] || '';
      return { isStep: true, stepNum: rawNum, text: restText };
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      return { isStep: true, stepNum: '•', text: trimmed.substring(2) };
    }

    return { isStep: false };
  };

  const renderTableCellContent = (
    rawText: string,
    keyPrefix: string,
    isFirstCol: boolean
  ) => {
    if (!rawText) return null;

    const cleaned = cleanCellText(rawText);
    const subLines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);

    const hasMultipleItems = subLines.length > 1 || extractStepInfo(subLines[0] || '').isStep;

    if (hasMultipleItems && subLines.length > 0) {
      return (
        <View style={styles.cellMultiLineStack}>
          {subLines.map((line, lIdx) => {
            const stepInfo = extractStepInfo(line);
            if (stepInfo.isStep) {
              const isBullet = stepInfo.stepNum === '•';
              return (
                <View key={`${keyPrefix}-step-${lIdx}`} style={styles.cellStepRow}>
                  <View
                    style={[
                      isBullet ? styles.cellBulletBadge : styles.cellStepBadge,
                      { backgroundColor: theme.primary + '1F' }
                    ]}
                  >
                    <ThemedText
                      style={[
                        isBullet ? styles.cellBulletBadgeText : styles.cellStepBadgeText,
                        { color: theme.primary }
                      ]}
                    >
                      {stepInfo.stepNum}
                    </ThemedText>
                  </View>
                  <View style={styles.cellStepTextContainer}>
                    {renderInlineStyles(
                      stepInfo.text || '',
                      `${keyPrefix}-st-${lIdx}`,
                      isFirstCol ? 'smallBold' : 'small',
                      isFirstCol ? [styles.tableCellText, { color: theme.primary }] : styles.tableCellText
                    )}
                  </View>
                </View>
              );
            }

            return (
              <View key={`${keyPrefix}-line-${lIdx}`} style={styles.cellLineRow}>
                {renderInlineStyles(
                  line,
                  `${keyPrefix}-ln-${lIdx}`,
                  isFirstCol ? 'smallBold' : 'small',
                  isFirstCol ? [styles.tableCellText, { color: theme.primary }] : styles.tableCellText
                )}
              </View>
            );
          })}
        </View>
      );
    }

    return renderInlineStyles(
      cleaned,
      keyPrefix,
      isFirstCol ? 'smallBold' : 'small',
      isFirstCol ? [styles.tableCellText, { color: theme.primary }] : styles.tableCellText
    );
  };

  // ── Table Renderer ──────────────────────────────────────────────────────
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

  const renderTable = (rows: string[][], tIdx: number) => {
    const tableKey = `table-${tIdx}`;
    const headers = rows[0] ?? [];
    const body = rows.slice(1);
    if (headers.length === 0 || body.length === 0) return null;

    const colCount = headers.length;
    const needsScroll = isMobile && colCount > 3;

    const getColWidth = (colIdx: number) => {
      if (!needsScroll) return undefined;
      if (colIdx === 0) return Math.max(110, headers[0].length * 10);
      return Math.max(90, headers[colIdx].length * 9);
    };

    const tableContent = (
      <View style={styles.tableGrid}>
        {/* Header */}
        <View style={[styles.tableHeaderRow, { backgroundColor: theme.primary }]}>
          {headers.map((h, hi) => (
            <View
              key={`${tableKey}-h-${hi}`}
              style={[
                styles.tableHeaderCell,
                !needsScroll && { flex: 1 },
                needsScroll && { width: getColWidth(hi) },
                hi > 0 && { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
              ]}
            >
              {renderInlineStyles(h, `${tableKey}-h-${hi}`, 'smallBold', styles.tableHeaderText)}
            </View>
          ))}
        </View>
        {/* Body */}
        {body.map((row, rIdx) => (
          <View
            key={`${tableKey}-r-${rIdx}`}
            style={[
              styles.tableBodyRow,
              { borderTopColor: theme.border, backgroundColor: rIdx % 2 === 0 ? theme.card : theme.backgroundElement },
            ]}
          >
            {headers.map((_, cIdx) => (
              <View
                key={`${tableKey}-r${rIdx}-c${cIdx}`}
                style={[
                  styles.tableBodyCell,
                  !needsScroll && { flex: 1 },
                  needsScroll && { width: getColWidth(cIdx) },
                  cIdx > 0 && { borderLeftWidth: 1, borderLeftColor: theme.border + '66' },
                ]}
              >
                {renderTableCellContent(
                  row[cIdx] ?? '—',
                  `${tableKey}-c-${rIdx}-${cIdx}`,
                  cIdx === 0
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    );

    return (
      <View
        key={tableKey}
        style={[
          styles.tableOuterContainer,
          {
            borderColor: theme.border,
            backgroundColor: theme.card,
            ...Platform.select({
              web: { boxShadow: `0 1px 6px ${theme.cardShadow || 'rgba(0,0,0,0.05)'}` } as any,
              default: { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
            }),
          },
        ]}
      >
        {needsScroll ? (
          <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled contentContainerStyle={{ minWidth: '100%' }}>
            {tableContent}
          </ScrollView>
        ) : (
          tableContent
        )}
      </View>
    );
  };

  // ── Main Line Parser ────────────────────────────────────────────────────
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Table rows
    if (trimmedLine.startsWith('|')) {
      const isDivider = trimmedLine.replace(/[\s|:-]/g, '') === '';
      if (isDivider) continue;
      const cells = trimmedLine.split('|').map((c) => c.trim());
      if (cells[0] === '') cells.shift();
      if (cells[cells.length - 1] === '') cells.pop();
      currentTableRows.push(cells);
      continue;
    }

    flushTable();

    // Empty
    if (!trimmedLine) {
      renderedElements.push(<View key={`empty-${i}`} style={styles.spacing} />);
      continue;
    }

    // Blockquote
    if (trimmedLine.startsWith('>')) {
      const quoteText = trimmedLine.substring(1).trim();
      renderedElements.push(
        <View key={`quote-${i}`} style={[styles.blockquote, { borderLeftColor: theme.accent, backgroundColor: theme.backgroundElement }]}>
          {renderInlineStyles(quoteText, `quote-text-${i}`, 'small', { fontStyle: 'italic', lineHeight: 21 })}
        </View>
      );
      continue;
    }

    // Horizontal Rule
    if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
      renderedElements.push(<View key={`hr-${i}`} style={[styles.hr, { backgroundColor: theme.border }]} />);
      continue;
    }

    // Headings
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const fontSize = level === 1 ? 20 : level === 2 ? 18 : level === 3 ? 16 : 15;
      renderedElements.push(
        <View key={`h-${level}-${i}`} style={[styles.headingContainer, { borderBottomColor: theme.border + '44' }]}>
          {renderInlineStyles(headingText, `h-${level}-text-${i}`, 'smallBold', {
            fontSize, color: theme.text, lineHeight: fontSize * 1.4,
          })}
        </View>
      );
      continue;
    }

    // Numbered list — detect section-title style ("1. **Title**")
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s(.*)/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const listText = numberedMatch[2];
      // If the entire text is bold (**...**), render as a sub-heading
      const isSectionTitle = /^\*\*[^*]+\*\*$/.test(listText.trim());

      if (isSectionTitle) {
        const titleText = listText.replace(/^\*\*/, '').replace(/\*\*$/, '');
        renderedElements.push(
          <View key={`num-heading-${i}`} style={styles.numberedHeading}>
            <View style={[styles.numHeadingBadge, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.numHeadingBadgeText}>{num}</ThemedText>
            </View>
            <ThemedText type="smallBold" style={[styles.numHeadingText, { color: theme.text }]}>
              {titleText}
            </ThemedText>
          </View>
        );
      } else {
        renderedElements.push(
          <View key={`num-${i}`} style={styles.listRow}>
            <ThemedText type="smallBold" style={[styles.listNumber, { color: theme.primary }]}>{num}.</ThemedText>
            <View style={styles.listTextContainer}>
              {renderInlineStyles(listText, `num-text-${i}`, 'small', { lineHeight: 21 })}
            </View>
          </View>
        );
      }
      continue;
    }

    // Bullet list
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
      const bulletText = trimmedLine.substring(2);
      renderedElements.push(
        <View key={`bullet-${i}`} style={styles.listRow}>
          <ThemedText type="small" style={[styles.bulletDot, { color: theme.primary }]}>•</ThemedText>
          <View style={styles.listTextContainer}>
            {renderInlineStyles(bulletText, `bullet-text-${i}`, 'small', { lineHeight: 21 })}
          </View>
        </View>
      );
      continue;
    }

    // Paragraph
    renderedElements.push(
      <View key={`p-${i}`} style={styles.paragraph}>
        {renderInlineStyles(trimmedLine, `p-text-${i}`, 'small', { lineHeight: 21 })}
      </View>
    );
  }

  flushTable();
  return <View style={styles.container}>{renderedElements}</View>;
});

// ══════════════════════════════════════════════════════════════════════════
// Styles
// ══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  spacing: {
    height: 6,
  },
  hr: {
    height: 1,
    width: '100%',
    marginVertical: 14,
    borderRadius: 1,
  },

  // ── Headings ──
  headingContainer: {
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    paddingBottom: 4,
  },

  // ── Lists ──
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 3,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 16,
    fontSize: 16,
    lineHeight: 21,
    textAlign: 'center',
    marginRight: 6,
  },
  listNumber: {
    width: 22,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'right',
    marginRight: 6,
  },
  listTextContainer: {
    flex: 1,
  },

  // ── Numbered section headings (e.g. "1. **Title**") ──
  numberedHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
    gap: 8,
  },
  numHeadingBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numHeadingBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  numHeadingText: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },

  // ── Inline text ──
  codeInlineText: {
    fontFamily: 'monospace',
    fontSize: 12,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  paragraph: {
    marginVertical: 3,
  },

  // ── Table ──
  tableOuterContainer: {
    marginVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
  },
  tableGrid: {
    flexDirection: 'column',
    minWidth: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 40,
  },
  tableHeaderCell: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    alignItems: 'stretch',
    minHeight: 36,
  },
  tableBodyCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // ── Table Cell Content Styles ─────────────────────────────────────────
  cellMultiLineStack: {
    flexDirection: 'column',
    gap: 6,
    width: '100%',
  },
  cellStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    width: '100%',
  },
  cellStepBadge: {
    width: 18,
    height: 18,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  cellStepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  cellBulletBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  cellBulletBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  cellStepTextContainer: {
    flex: 1,
  },
  cellLineRow: {
    marginVertical: 1,
  },

  // ── Blockquote ──
  blockquote: {
    borderLeftWidth: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginVertical: 8,
    borderRadius: 6,
  },
});
