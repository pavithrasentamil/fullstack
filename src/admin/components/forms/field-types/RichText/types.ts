import { BaseEditor, Selection } from 'slate';
import { HistoryEditor } from 'slate-history';
import { ReactEditor } from 'slate-react';
import { RichTextField } from '../../../../../fields/config/types';

type CustomText = { text: string;[x: string]: unknown }
type CustomElement = { type?: string; children: CustomText[] }

export type Props = Omit<RichTextField, 'type'> & {
  path?: string
}

export interface BlurSelectionEditor extends BaseEditor {
  blurSelection?: Selection
}
export interface ShouldEnterBreakOutEditor extends BaseEditor {
  shouldBreakOutOnEnter(element: CustomElement): boolean;
}
declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor & BlurSelectionEditor & ShouldEnterBreakOutEditor
    Element: CustomElement
    Text: CustomText
  }
}
