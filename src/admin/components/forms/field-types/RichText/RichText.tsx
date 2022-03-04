import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createEditor } from 'slate';
import { Editable, withReact, Slate } from 'slate-react';
import { withHistory } from 'slate-history';
import { richText } from '../../../../../fields/validations';
import useField from '../../useField';
import withCondition from '../../withCondition';
import Label from '../../Label';
import Error from '../../Error';
import leafTypes from './leaves';
import elementTypes from './elements';
import enablePlugins from './enablePlugins';
import defaultValue from '../../../../../fields/richText/defaultValue';
import FieldTypeGutter from '../../FieldTypeGutter';
import FieldDescription from '../../FieldDescription';
import withHTML from './plugins/withHTML';
import { Props } from './types';
import { RichTextElement, RichTextLeaf } from '../../../../../fields/config/types';
import mergeCustomFunctions from './mergeCustomFunctions';
import withEnterBreakOut from './plugins/withEnterBreakOut';
import { onKeyDown } from './OnKeyDown';

import './index.scss';

const defaultElements: RichTextElement[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'indent', 'link', 'relationship', 'upload'];
const defaultLeaves: RichTextLeaf[] = ['bold', 'italic', 'underline', 'strikethrough', 'code'];

const baseClass = 'rich-text';

const RichText: React.FC<Props> = (props) => {
  const {
    path: pathFromProps,
    name,
    required,
    validate = richText,
    label,
    admin,
    admin: {
      readOnly,
      style,
      className,
      width,
      placeholder,
      description,
      hideGutter,
      condition,
    } = {},
  } = props;

  const elements: RichTextElement[] = admin?.elements || defaultElements;
  const leaves: RichTextLeaf[] = admin?.leaves || defaultLeaves;

  const path = pathFromProps || name;

  const [loaded, setLoaded] = useState(false);
  const [enabledElements, setEnabledElements] = useState({});
  const [enabledLeaves, setEnabledLeaves] = useState({});
  const [initialValueKey, setInitialValueKey] = useState('');
  const editorRef = useRef(null);

  const renderElement = useCallback(({ attributes, children, element }) => {
    const matchedElement = enabledElements[element?.type];
    const Element = matchedElement?.Element;

    if (Element) {
      return (
        <Element
          attributes={attributes}
          element={element}
          path={path}
          fieldProps={props}
          editorRef={editorRef}
        >
          {children}
        </Element>
      );
    }

    return <div {...attributes}>{children}</div>;
  }, [enabledElements, path, props]);

  const renderLeaf = useCallback(({ attributes, children, leaf }) => {
    const matchedLeafName = Object.keys(enabledLeaves).find((leafName) => leaf[leafName]);

    if (enabledLeaves[matchedLeafName]?.Leaf) {
      const { Leaf } = enabledLeaves[matchedLeafName];

      return (
        <Leaf
          attributes={attributes}
          leaf={leaf}
          path={path}
          fieldProps={props}
          editorRef={editorRef}
        >
          {children}
        </Leaf>
      );
    }

    return (
      <span {...attributes}>{children}</span>
    );
  }, [enabledLeaves, path, props]);

  const memoizedValidate = useCallback((value) => {
    const validationResult = validate(value, { required });
    return validationResult;
  }, [validate, required]);

  const fieldType = useField({
    path,
    validate: memoizedValidate,
    condition,
  });

  const {
    value,
    showError,
    setValue,
    errorMessage,
    initialValue,
  } = fieldType;

  const classes = [
    baseClass,
    'field-type',
    className,
    showError && 'error',
    readOnly && `${baseClass}--read-only`,
  ].filter(Boolean).join(' ');

  const editor = useMemo(() => {
    let CreatedEditor = withEnterBreakOut(
      withHistory(
        withReact(
          createEditor(),
        ),
      ),
    );

    CreatedEditor = enablePlugins(CreatedEditor, elements);
    CreatedEditor = enablePlugins(CreatedEditor, leaves);

    CreatedEditor = withHTML(CreatedEditor);

    return CreatedEditor;
  }, [elements, leaves]);

  const onBlur = useCallback(() => {
    editor.blurSelection = editor.selection;
  }, [editor]);

  useEffect(() => {
    if (!loaded) {
      const mergedElements = mergeCustomFunctions(elements, elementTypes);
      const mergedLeaves = mergeCustomFunctions(leaves, leafTypes);

      setEnabledElements(mergedElements);
      setEnabledLeaves(mergedLeaves);

      setLoaded(true);
    }
  }, [loaded, elements, leaves]);

  useEffect(() => {
    setInitialValueKey(JSON.stringify(initialValue || ''));
  }, [initialValue]);

  if (!loaded) {
    return null;
  }

  let valueToRender = value;
  if (typeof valueToRender === 'string') {
    try {
      const parsedJSON = JSON.parse(valueToRender);
      valueToRender = parsedJSON;
    } catch (err) {
      // do nothing
    }
  }

  if (!valueToRender) valueToRender = defaultValue;

  return (
    <div
      key={initialValueKey}
      className={classes}
      style={{
        ...style,
        width,
      }}
    >
      <div className={`${baseClass}__wrap`}>
        {!hideGutter && (<FieldTypeGutter />)}
        <Error
          showError={showError}
          message={errorMessage}
        />
        <Label
          htmlFor={path}
          label={label}
          required={required}
        />
        <Slate
          editor={editor}
          value={valueToRender as any[]}
          onChange={(val) => {
            if (val !== defaultValue && val !== value) {
              setValue(val);
            }
          }}
        >
          <div className={`${baseClass}__wrapper`}>
            <div className={`${baseClass}__toolbar`}>
              {elements.map((element, i) => {
                let elementName: string;
                if (typeof element === 'object' && element?.name) elementName = element.name;
                if (typeof element === 'string') elementName = element;

                const elementType = enabledElements[elementName];
                const Button = elementType?.Button;

                if (Button) {
                  return (
                    <Button
                      key={i}
                      path={path}
                    />
                  );
                }

                return null;
              })}
              {leaves.map((leaf, i) => {
                let leafName: string;
                if (typeof leaf === 'object' && leaf?.name) leafName = leaf.name;
                if (typeof leaf === 'string') leafName = leaf;

                const leafType = enabledLeaves[leafName];
                const Button = leafType?.Button;

                if (Button) {
                  return (
                    <Button
                      key={i}
                      path={path}
                    />
                  );
                }

                return null;
              })}
            </div>
            <div
              className={`${baseClass}__editor`}
              ref={editorRef}
            >
              <Editable
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                placeholder={placeholder}
                spellCheck
                readOnly={readOnly}
                onBlur={onBlur}
                onKeyDown={(event) => {
                  onKeyDown(event, editor);
                }}
              />
            </div>
          </div>
        </Slate>
        <FieldDescription
          value={value}
          description={description}
        />
      </div>
    </div>
  );
};
export default withCondition(RichText);
