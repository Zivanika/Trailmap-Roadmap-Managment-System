// Same card as Open Graph; X reads twitter:image first.
export { default, alt, size, contentType } from './opengraph-image'
// Route segment config must be declared here, not re-exported.
export const revalidate = 3600
