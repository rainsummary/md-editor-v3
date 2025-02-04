import copy from 'copy-to-clipboard';
import { insert, setPosition } from '.';

export type ToolDirective =
  | 'bold'
  | 'underline'
  | 'italic'
  | 'strikeThrough'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'quote'
  | 'unorderedList'
  | 'orderedList'
  | 'codeRow'
  | 'code'
  | 'link'
  | 'image'
  | 'table'
  | 'sub'
  | 'sup'
  | 'help'
  | 'prettier'
  | 'tab'
  | 'shiftTab'
  | 'ctrlC'
  | 'ctrlX'
  | 'ctrlD';

/**
 * 快速获取分割内容
 *
 * @param textarea
 * @returns
 */
export const splitHelp = (textarea: HTMLTextAreaElement) => {
  const text = textarea.value;

  // 选中前半部分
  const prefixStr = text.substring(0, textarea.selectionStart);
  // 选中后半部分
  const subfixStr = text.substring(textarea.selectionEnd, text.length);

  const prefixStrIndexOfLineCode = prefixStr.lastIndexOf('\n');
  // 选中行前所有行
  const prefixStrEndRow = prefixStr.substring(0, prefixStrIndexOfLineCode + 1);

  const subfixStrIndexOfLineCode = subfixStr.indexOf('\n');
  // 选中行后所有行
  // 如果后面的内容没有换行符，代表该行就是最后一行，即不存在后续行内容
  const subfixStrEndRow = subfixStr.substring(
    subfixStrIndexOfLineCode === -1 ? subfixStr.length : subfixStrIndexOfLineCode,
    subfixStr.length
  );

  // 选中当前行前面未选中部分
  const prefixSupply = prefixStr.substring(
    prefixStrIndexOfLineCode + 1,
    prefixStr.length
  );

  // 选中当前行后面未选中部分
  const subfixSupply = subfixStr.substring(0, subfixStrIndexOfLineCode);

  return {
    prefixStr,
    subfixStr,
    prefixStrEndRow,
    subfixStrEndRow,
    prefixSupply,
    subfixSupply
  };
};

/**
 *
 * @param direct 操作指令
 * @param selectedText 输入框选中的内容记录
 * @param inputArea 输入框
 * @param params 自定义参数
 * @returns string
 */
export const directive2flag = (
  direct: ToolDirective,
  selectedText = '',
  inputArea: HTMLTextAreaElement,
  params?: any
): string => {
  // 目标值
  let targetValue = '';
  // 光标开始位置偏移量
  let deviationStart = 0;
  // 结束位置偏移量
  let deviationEnd = 0;
  // 是否选中
  let select = false;
  // 选中前半部分内容
  let prefixVal;
  // 后半部分
  let subfixVal;

  if (/^h[1-6]{1}$/.test(direct)) {
    const pix = direct.replace(/^h(\d)/, (_, num) => {
      return new Array(Number(num)).fill('#', 0, num).join('');
    });

    targetValue = `${pix} ${selectedText}`;
    deviationStart = pix.length + 1;
  } else if (direct === 'prettier') {
    return window.prettier.format(inputArea.value, {
      parser: 'markdown',
      plugins: window.prettierPlugins
    });
  } else {
    switch (direct) {
      case 'bold': {
        targetValue = `**${selectedText}**`;
        deviationStart = 2;
        deviationEnd = -2;
        break;
      }
      case 'underline': {
        targetValue = `<u>${selectedText}</u>`;
        deviationStart = 3;
        deviationEnd = -4;
        break;
      }
      case 'italic': {
        targetValue = `*${selectedText}*`;
        deviationStart = 1;
        deviationEnd = -1;
        break;
      }
      case 'strikeThrough': {
        targetValue = `~${selectedText}~`;
        deviationStart = 1;
        deviationEnd = -1;
        break;
      }
      case 'sub': {
        targetValue = `<sub>${selectedText}</sub>`;
        deviationStart = 5;
        deviationEnd = -6;
        break;
      }
      case 'sup': {
        targetValue = `<sup>${selectedText}</sup>`;
        deviationStart = 5;
        deviationEnd = -6;
        break;
      }
      case 'codeRow': {
        targetValue = '`' + selectedText + '`';
        deviationStart = 1;
        deviationEnd = -1;
        break;
      }
      case 'quote': {
        targetValue = `> ${selectedText}`;
        deviationStart = 2;
        break;
      }
      case 'orderedList': {
        targetValue = `1. ${selectedText}`;
        deviationStart = 3;
        break;
      }
      case 'unorderedList': {
        targetValue = `- ${selectedText}`;
        deviationStart = 2;
        break;
      }
      case 'code': {
        targetValue = '```language\n' + selectedText + '\n```\n';
        deviationStart = 3;
        deviationEnd = 11 - targetValue.length;
        select = true;
        break;
      }
      case 'table': {
        targetValue = '| 表头 | 表头 |\n| - | - |\n| 内容 | 内容 |\n';
        deviationStart = 2;
        deviationEnd = 4 - targetValue.length;
        select = true;
        break;
      }
      case 'link': {
        const { desc, url } = params;
        targetValue = `[${desc}](${url})`;
        break;
      }
      case 'image': {
        const { desc, url } = params;
        targetValue = `![${desc}](${url})\n`;
        break;
      }
      case 'tab': {
        // 缩进
        // 1. 未选中内容，在当前位置添加两个空格
        // 2. 选中单行或中间内容，
        // 3. 选中多行
        selectedText = window.getSelection()?.toString() || '';

        const { tabWidth = 2 } = params;
        const retract = new Array(tabWidth).fill(' ').join('');

        if (selectedText === '') {
          targetValue = retract;
        } else if (/\n/.test(selectedText)) {
          const { prefixStr, subfixStr, prefixSupply, subfixSupply } =
            splitHelp(inputArea);

          // 整个待调整的内容
          const str2adjust = `${prefixSupply}${selectedText}${subfixSupply}`;

          // 分割出每一行，从而给每一行添加缩进
          const str2AdjustRows = str2adjust.split('\n');

          targetValue = str2AdjustRows
            .map((strItem) => {
              return `${retract}${strItem}`;
            })
            .join('\n');

          prefixVal = prefixStr.substring(0, prefixStr.length - prefixSupply.length);
          subfixVal = subfixStr.substring(subfixSupply.length, subfixStr.length);

          // 设置选中内容
          select = true;
          // 设置选中开始位置偏移tabWidth宽度
          deviationStart = tabWidth;
          // 设置选中结束位置偏移，由于只选中中间部分，需减去上面补充选择内容和后面补充选择内容的长度
          deviationEnd = -prefixSupply.length - subfixSupply.length;
        } else {
          const mdText = inputArea.value;
          const prefixStr = mdText.substring(0, inputArea.selectionStart);

          if (/\n$/.test(prefixStr) || prefixStr === '') {
            // 选择当前行全部内容，给当前行整体添加缩进
            targetValue = `${retract}${selectedText}`;
            select = true;
          } else {
            // 选中中间部分内容，清空内容添加空格
            targetValue = retract;
          }
        }

        break;
      }
      case 'shiftTab': {
        // 当选择内容后使用该快捷键，未及时清空缓存内容，所以该功能直接重新获取选中内容
        selectedText = window.getSelection()?.toString() || '';

        const { tabWidth = 2 } = params;

        const {
          prefixStr,
          prefixStrEndRow,
          subfixStrEndRow,
          prefixSupply,
          subfixSupply
        } = splitHelp(inputArea);

        const normalReg = new RegExp(`^\\s{${tabWidth}}`);

        /**
         *
         * @param selected 是否修改后选中内容
         * @param row 是否是整行
         * @returns string
         */
        const notMultiRow = (selected = false, row = false) => {
          // 当前所在行内容
          const str2adjust = `${prefixSupply}${selectedText}${subfixSupply}`;

          // 拼接内容
          if (normalReg.test(str2adjust)) {
            // 以tabWidth或者更多个空格开头
            const startPos = prefixStr.length - (row ? 0 : tabWidth);
            const endPos = selected
              ? startPos + selectedText.length - tabWidth
              : startPos;
            setPosition(inputArea, startPos, endPos);

            return `${prefixStrEndRow}${str2adjust.replace(
              normalReg,
              ''
            )}${subfixStrEndRow}`;
          } else if (/^\s/.test(str2adjust)) {
            // 不足但是存在
            const deletedTabStr = str2adjust.replace(/^\s/, '');
            const deletedLength = str2adjust.length - deletedTabStr.length;

            const startPos = inputArea.selectionStart - (row ? 0 : deletedLength);
            // 选中了内容，将正确设置结束位置
            const endPos = selected
              ? startPos + selectedText.length - deletedLength
              : startPos;
            setPosition(inputArea, startPos, endPos);

            return `${prefixStrEndRow}${deletedTabStr}${subfixStrEndRow}`;
          } else {
            targetValue = selectedText;
          }
        };

        if (selectedText === '') {
          // 未选中任何内容，执行获取当前行，去除行首tabWidth个空格，只到无空格可去除
          const newContent = notMultiRow();

          if (newContent) {
            return newContent;
          }
        } else if (/\n/.test(selectedText)) {
          // 选中了多行

          // 整个待调整的内容
          const str2adjust = `${prefixSupply}${selectedText}${subfixSupply}`;

          // 分割出每一行，从而给每一行添加缩进
          const str2AdjustRows = str2adjust.split('\n');

          // 首行减少空格数，用于计算选中开始位置
          // 总共减少空格数，用于计算选中结束位置
          let [firstRowDelNum, totalRowDelNum] = [0, 0];

          const str2AdjustRowsMod = str2AdjustRows
            .map((strItem, index) => {
              if (normalReg.test(strItem)) {
                // 以tabWidth或者更多个空格开头
                if (index === 0) {
                  firstRowDelNum = tabWidth;
                }

                totalRowDelNum += tabWidth;

                return strItem.replace(normalReg, '');
              } else if (/^\s/.test(strItem)) {
                const deletedTabStr = strItem.replace(/^\s/, '');

                totalRowDelNum += strItem.length - deletedTabStr.length;

                // 不足但是存在
                return deletedTabStr;
              }

              return strItem;
            })
            .join('\n');

          setPosition(
            inputArea,
            inputArea.selectionStart - firstRowDelNum,
            inputArea.selectionEnd - totalRowDelNum
          );

          return `${prefixStrEndRow}${str2AdjustRowsMod}${subfixStrEndRow}`;
        } else {
          // 选中的单行或部分吗，表现与未选中一致

          const newContent = notMultiRow(true, true);

          if (newContent) {
            return newContent;
          }
        }

        break;
      }
      case 'ctrlC': {
        const { prefixSupply, subfixSupply } = splitHelp(inputArea);

        if (selectedText === '') {
          // 未选中，复制整行
          copy(`${prefixSupply}${subfixSupply}`);
        } else {
          copy(selectedText);
        }

        return inputArea.value;
      }
      case 'ctrlX': {
        const {
          prefixStrEndRow,
          subfixStrEndRow,
          prefixStr,
          subfixStr,
          prefixSupply,
          subfixSupply
        } = splitHelp(inputArea);

        if (selectedText === '') {
          // 未选中，复制整行
          copy(`${prefixSupply}${subfixSupply}`);
          setPosition(inputArea, prefixStrEndRow.length);
          return `${prefixStrEndRow}${subfixStrEndRow.replace(/^\n/, '')}`;
        } else {
          copy(selectedText);
          setPosition(inputArea, prefixStr.length);
          return `${prefixStr}${subfixStr}`;
        }
      }
      case 'ctrlD': {
        // 删除行规则：无论有没有选中，均删除当前行
        const { prefixStrEndRow, subfixStrEndRow } = splitHelp(inputArea);
        setPosition(inputArea, prefixStrEndRow.length);

        return `${prefixStrEndRow}${subfixStrEndRow.replace(/^\n/, '')}`;
      }
    }
  }

  return insert(inputArea, targetValue, {
    deviationStart,
    deviationEnd,
    select,
    prefixVal,
    subfixVal
  });
};
