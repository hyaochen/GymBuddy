import type * as ReactJSX from 'react/jsx-runtime'

declare global {
    namespace JSX {
        type Element = ReactJSX.JSX.Element
        type ElementType = ReactJSX.JSX.ElementType
        type ElementClass = ReactJSX.JSX.ElementClass
        type IntrinsicElements = ReactJSX.JSX.IntrinsicElements
        type IntrinsicAttributes = ReactJSX.JSX.IntrinsicAttributes
        type LibraryManagedAttributes<C, P> = ReactJSX.JSX.LibraryManagedAttributes<C, P>
        type ElementAttributesProperty = ReactJSX.JSX.ElementAttributesProperty
        type ElementChildrenAttribute = ReactJSX.JSX.ElementChildrenAttribute
    }
}

export {}
