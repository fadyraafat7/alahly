import { data } from 'react-router'
import { privateMeta } from '../lib/meta'
export { NotFound as default } from '../../src/pages/NotFound'
export const loader = () => data(null, { status: 404 })
export const meta = () => privateMeta('Page not found')
