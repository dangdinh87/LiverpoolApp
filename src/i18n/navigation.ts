import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// usePathname from here returns the path without the /en prefix, so active-link
// checks keep working on English pages.
export const { Link, usePathname, useRouter, redirect, getPathname } = createNavigation(routing);
