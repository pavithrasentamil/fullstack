import isHotkey from 'is-hotkey';
import { Node, Transforms, Element as SlateElement, Text, Editor } from 'slate';
import listTypes from '../elements/listTypes';
import hotkeys from '../hotkeys';
import toggleLeaf from '../leaves/toggle';

export const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, editor: Editor): void => {
  if (event.key === 'Enter') {
    if (event.shiftKey) {
      event.preventDefault();
      editor.insertText('\n');
    } else {
      const selectedElement = Node.descendant(editor, editor.selection.anchor.path.slice(0, -1));

      if (SlateElement.isElement(selectedElement)) {
        // Allow hard enter to "break out" of certain elements
        if (editor.shouldBreakOutOnEnter(selectedElement)) {
          event.preventDefault();
          const selectedLeaf = Node.descendant(editor, editor.selection.anchor.path);

          if (Text.isText(selectedLeaf) && String(selectedLeaf.text).length === editor.selection.anchor.offset) {
            Transforms.insertNodes(editor, { children: [{ text: '' }] });
          } else {
            Transforms.splitNodes(editor);
            Transforms.setNodes(editor, {});
          }
        }
      }
    }
  }

  if (event.key === 'Backspace') {
    const selectedElement = Node.descendant(editor, editor.selection.anchor.path.slice(0, -1));

    if (SlateElement.isElement(selectedElement) && selectedElement.type === 'li') {
      const selectedLeaf = Node.descendant(editor, editor.selection.anchor.path);
      if (Text.isText(selectedLeaf) && String(selectedLeaf.text).length === 1) {
        Transforms.unwrapNodes(editor, {
          match: (n) => SlateElement.isElement(n) && listTypes.includes(n.type),
          split: true,
        });

        Transforms.setNodes(editor, {});
      }
    } else if (SlateElement.isElement(selectedElement) && editor.isVoid(selectedElement)) {
      Transforms.removeNodes(editor);
    }
  }

  Object.keys(hotkeys).forEach((hotkey) => {
    if (isHotkey(hotkey, event)) {
      event.preventDefault();
      const mark = hotkeys[hotkey];
      toggleLeaf(editor, mark);
    }
  });
};
