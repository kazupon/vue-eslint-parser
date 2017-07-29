/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
import * as path from "path"
import * as AST from "./ast"
import {LocationCalculator} from "./common/location-calculator"
import {HTMLParser, HTMLTokenizer} from "./html"
import {parseScript, parseScriptElement} from "./script"
import services from "./parser-services"

const STARTS_WITH_LT = /^\s*</

/**
 * Check whether the code is a Vue.js component.
 * @param code The source code to check.
 * @param options The parser options.
 * @returns `true` if the source code is a Vue.js component.
 */
function isVueFile(code: string, options: any): boolean {
    const filePath = (options.filePath as string | undefined) || "unknown.js"
    return path.extname(filePath) === ".vue" || STARTS_WITH_LT.test(code)
}

/**
 * Check whether the node is a `<template>` element.
 * @param node The node to check.
 * @returns `true` if the node is a `<template>` element.
 */
function isTemplateElement(node: AST.VNode): node is AST.VElement {
    return node.type === "VElement" && node.name === "template"
}

/**
 * Check whether the node is a `<script>` element.
 * @param node The node to check.
 * @returns `true` if the node is a `<script>` element.
 */
function isScriptElement(node: AST.VNode): node is AST.VElement {
    return node.type === "VElement" && node.name === "script"
}

/**
 * Parse the given source code.
 * @param code The source code to parse.
 * @param options The parser options.
 * @returns The parsing result.
 */
export function parseForESLint(code: string, options: any): AST.ESLintExtendedProgram {
    options = Object.assign({
        comment: true,
        ecmaVersion: 2015,
        loc: true,
        range: true,
        tokens: true,
    }, options || {})

    if (!isVueFile(code, options)) {
        return parseScript(code, options)
    }

    const tokenizer = new HTMLTokenizer(code)
    const rootAST = new HTMLParser(tokenizer, options).parse()
    const locationCalcurator = new LocationCalculator(tokenizer.gaps, tokenizer.lineTerminators)
    const script = rootAST.children.find(isScriptElement) as AST.VElement | undefined // https://github.com/Microsoft/TypeScript/issues/7657
    const template = rootAST.children.find(isTemplateElement) as AST.VElement | undefined
    const result = (script != null)
        ? parseScriptElement(script, locationCalcurator, options)
        : parseScript("", options)
    const concreteInfo: AST.HasConcreteInfo = {
        tokens: rootAST.tokens,
        comments: rootAST.comments,
        errors: rootAST.errors,
    }
    const templateBody = (template != null)
        ? Object.assign(template, concreteInfo)
        : undefined

    result.ast.templateBody = templateBody
    result.services = Object.assign(result.services || {}, services)

    return result
}

/**
 * Parse the given source code.
 * @param code The source code to parse.
 * @param options The parser options.
 * @returns The parsing result.
 */
export function parse(code: string, options: any): AST.ESLintProgram {
    return parseForESLint(code, options).ast
}

export {AST}
