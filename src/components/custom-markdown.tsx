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
    let res = txt
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?ul>/gi, '')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/?[a-z][a-z0-9]*[^<>]*>/gi, '')
      .trim();

    // Auto-balance odd count of ** so markdown parser doesn't break
    const stars = res.match(/\*\*/g);
    if (stars && stars.length % 2 !== 0) {
      res += '**';
    }
    return res;
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
    // On mobile (<600px), any multi-column table (2 or more columns) needs horizontal scroll
    const needsScroll = isMobile ? colCount >= 2 : colCount > 4;

    const getColWidth = (colIdx: number) => {
      if (!needsScroll) return undefined;
      // First column (step/phase or title)
      if (colIdx === 0) return Math.max(120, (headers[0]?.length || 6) * 13);
      // Detailed content columns need ample width for readable sentences
      return Math.max(180, (headers[colIdx]?.length || 8) * 14);
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
          {renderInlineStyles(quoteText, `quote-text-${i}`, 'small', { fontStyle: 'italic', lineHeight: 22 })}
        </View>
      );
      continue;
    }

    // Horizontal Rule
    if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
      renderedElements.push(<View key={`hr-${i}`} style={[styles.hr, { backgroundColor: theme.border }]} />);
      continue;
    }

    // Headings: # Heading, ## Heading, ### Heading (with or without space)
    const headingMatch = trimmedLine.match(/^(#{1,6})\s*(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      let headingText = headingMatch[2].replace(/^\*\*|\*\*$/g, '').trim();
      const fontSize = level === 1 ? 19 : level === 2 ? 17 : level === 3 ? 15.5 : 14.5;
      renderedElements.push(
        <View key={`h-${level}-${i}`} style={styles.headingContainer}>
          <View style={[styles.headingAccentBar, { backgroundColor: theme.primary }]} />
          <ThemedText
            type="smallBold"
            style={[
              styles.headingTitle,
              { fontSize, color: theme.text }
            ]}
          >
            {headingText}
          </ThemedText>
        </View>
      );
      continue;
    }

    // Numbered list — detect structured items ("1. **Title:** Desc") or simple items
    const numberedMatch = trimmedLine.match(/^(\d+)[\.\)]\s*(.*)/s);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const listContent = numberedMatch[2].trim();

      const structuredMatch = listContent.match(/^\*\*([^*]+?)\*\*[:\s–—-]+(.*)/s) ||
                             listContent.match(/^([^*:\n]{2,35})[:]\s*(.*)/s);

      if (structuredMatch) {
        const itemTitle = structuredMatch[1].trim().replace(/[:\-–—]+$/, '');
        const itemDesc = structuredMatch[2].trim();

        renderedElements.push(
          <View
            key={`num-struct-${i}`}
            style={[
              styles.structuredCard,
              {
                backgroundColor: theme.backgroundElement + '70',
                borderColor: theme.border,
                borderLeftColor: theme.primary,
              }
            ]}
          >
            <View style={styles.structuredHeaderRow}>
              <View style={[styles.numberedBadge, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.numberedBadgeText}>{num}</ThemedText>
              </View>
              <ThemedText
                type="smallBold"
                style={[styles.structuredTitleText, { color: theme.text }]}
              >
                {itemTitle}
              </ThemedText>
            </View>
            {itemDesc ? (
              <View style={styles.structuredBodyText}>
                {renderInlineStyles(itemDesc, `num-desc-${i}`, 'small', {
                  lineHeight: 22,
                  color: theme.text,
                })}
              </View>
            ) : null}
          </View>
        );
      } else {
        renderedElements.push(
          <View key={`num-${i}`} style={styles.listRow}>
            <View style={[styles.numberedBadge, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.numberedBadgeText}>{num}</ThemedText>
            </View>
            <View style={styles.listTextContainer}>
              {renderInlineStyles(listContent, `num-text-${i}`, 'small', { lineHeight: 22, color: theme.text })}
            </View>
          </View>
        );
      }
      continue;
    }

    // Bullet list: - , * , • , +
    const bulletMatch = trimmedLine.match(/^[-*•+]\s*(.*)/s);
    if (bulletMatch) {
      const bulletText = bulletMatch[1].trim();

      // Check if bullet is a structured item like: **Title:** Description
      const structuredMatch = bulletText.match(/^\*\*([^*]+?)\*\*[:\s–—-]+(.*)/s) ||
                             bulletText.match(/^([^*:\n]{2,35})[:]\s*(.*)/s);

      if (structuredMatch) {
        const itemTitle = structuredMatch[1].trim().replace(/[:\-–—]+$/, '');
        const itemDesc = structuredMatch[2].trim();

        renderedElements.push(
          <View
            key={`bullet-struct-${i}`}
            style={[
              styles.structuredCard,
              {
                backgroundColor: theme.backgroundElement + '70',
                borderColor: theme.border,
                borderLeftColor: theme.primary,
              }
            ]}
          >
            <View style={styles.structuredHeaderRow}>
              <View style={[styles.bulletDotBadge, { backgroundColor: theme.primary + '20' }]}>
                <View style={[styles.bulletDotCore, { backgroundColor: theme.primary }]} />
              </View>
              <ThemedText
                type="smallBold"
                style={[styles.structuredTitleText, { color: theme.text }]}
              >
                {itemTitle}
              </ThemedText>
            </View>
            {itemDesc ? (
              <View style={styles.structuredBodyText}>
                {renderInlineStyles(itemDesc, `bullet-desc-${i}`, 'small', {
                  lineHeight: 22,
                  color: theme.text,
                })}
              </View>
            ) : null}
          </View>
        );
      } else {
        renderedElements.push(
          <View key={`bullet-${i}`} style={styles.listRow}>
            <View style={[styles.bulletDotBadge, { backgroundColor: theme.primary + '20' }]}>
              <View style={[styles.bulletDotCore, { backgroundColor: theme.primary }]} />
            </View>
            <View style={styles.listTextContainer}>
              {renderInlineStyles(bulletText, `bullet-text-${i}`, 'small', { lineHeight: 22, color: theme.text })}
            </View>
          </View>
        );
      }
      continue;
    }

    // Paragraph
    let paraText = trimmedLine;
    if (paraText.startsWith('**') && paraText.endsWith('**') && paraText.length > 4) {
      paraText = paraText.slice(2, -2);
    }
    renderedElements.push(
      <View key={`p-${i}`} style={styles.paragraph}>
        {renderInlineStyles(paraText, `p-text-${i}`, 'small', { lineHeight: 22, fontSize: 14.5, color: theme.text })}
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
    gap: 8,
  },
  headingAccentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
  },
  headingTitle: {
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.1,
  },

  // ── Structured Cards (e.g. key-value points) ──
  structuredCard: {
    marginVertical: 4,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3.5,
    gap: 4,
  },
  structuredHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  structuredTitleText: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  structuredBodyText: {
    paddingLeft: 26,
  },

  // ── Lists ──
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
    paddingLeft: 2,
    gap: 8,
  },
  bulletDotBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  bulletDotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  numberedBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 6,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  numberedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
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
    marginVertical: 4,
  },

  // ── Table ──
  tableOuterContainer: {
    marginVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    maxWidth: '100%',
    ...Platform.select({
      web: {
        overflowX: 'auto',
      } as any,
    }),
  },
  tableGrid: {
    flexDirection: 'column',
    minWidth: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 38,
  },
  tableHeaderCell: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    alignItems: 'stretch',
    minHeight: 36,
  },
  tableBodyCell: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 13.5,
    lineHeight: 20,
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
