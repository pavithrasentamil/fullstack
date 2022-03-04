import { Editor } from 'slate';

const enterBreakOutTypes = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'link'];

const withEnterBreakOut = (editor: Editor): Editor => {
  const newEditor = editor;
  newEditor.shouldBreakOutOnEnter = (element) => enterBreakOutTypes.includes(String(element.type));
  return newEditor;
};

export default withEnterBreakOut;
