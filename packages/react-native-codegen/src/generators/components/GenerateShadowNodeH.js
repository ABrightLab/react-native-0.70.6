/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

'use strict';

import type {SchemaType} from '../../CodegenSchema';

// File path -> contents
type FilesOutput = Map<string, string>;

const FileTemplate = ({
  imports,
  libraryName,
  componentClasses,
}: {
  imports: string,
  libraryName: string,
  componentClasses: string,
}) => `
/**
 * This code was generated by [react-native-codegen](https://www.npmjs.com/package/react-native-codegen).
 *
 * Do not edit this file as changes may cause incorrect behavior and will be lost
 * once the code is regenerated.
 *
 * ${'@'}generated by codegen project: GenerateShadowNodeH.js
 */

#pragma once

${imports}#include <react/renderer/components/${libraryName}/Props.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <jsi/jsi.h>

namespace facebook {
namespace react {

${componentClasses}

} // namespace react
} // namespace facebook
`;

const ComponentTemplate = ({
  className,
  eventEmitter,
}: {
  className: string,
  eventEmitter: string,
}) =>
  `
JSI_EXPORT extern const char ${className}ComponentName[];

/*
 * \`ShadowNode\` for <${className}> component.
 */
using ${className}ShadowNode = ConcreteViewShadowNode<
    ${className}ComponentName,
    ${className}Props${eventEmitter}>;
`.trim();

module.exports = {
  generate(
    libraryName: string,
    schema: SchemaType,
    packageName?: string,
    assumeNonnull: boolean = false,
  ): FilesOutput {
    const fileName = 'ShadowNodes.h';

    let hasAnyEvents = false;

    const moduleResults = Object.keys(schema.modules)
      .map(moduleName => {
        const module = schema.modules[moduleName];
        if (module.type !== 'Component') {
          return;
        }

        const {components} = module;
        // No components in this module
        if (components == null) {
          return null;
        }

        return Object.keys(components)
          .map(componentName => {
            const component = components[componentName];
            if (component.interfaceOnly === true) {
              return;
            }

            const hasEvents = component.events.length > 0;

            if (hasEvents) {
              hasAnyEvents = true;
            }

            const eventEmitter = hasEvents
              ? `,\n${componentName}EventEmitter`
              : '';

            const replacedTemplate = ComponentTemplate({
              className: componentName,
              eventEmitter,
            });

            return replacedTemplate;
          })
          .join('\n\n');
      })
      .filter(Boolean)
      .join('\n\n');

    const eventEmitterImport = `#include <react/renderer/components/${libraryName}/EventEmitters.h>\n`;

    const replacedTemplate = FileTemplate({
      componentClasses: moduleResults,
      libraryName,
      imports: hasAnyEvents ? eventEmitterImport : '',
    });

    return new Map([[fileName, replacedTemplate]]);
  },
};
