/*
 * SPDX-FileCopyrightText: 2021 Geoffroy Couprie <contact@geoffroycouprie.com>, Clément Delafargue <clement@delafargue.name>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
export function dispatchCustomEvent(node, suffix, detail, options = {}) {
  const eventName = `${node.nodeName.toLocaleLowerCase()}:${suffix}`;
  node.dispatchEvent(
    new CustomEvent(eventName, {
      detail,
      bubbles: true,
      composed: true,
      ...options,
    })
  );
}
