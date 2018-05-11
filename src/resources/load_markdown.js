import marked from 'marked';
import filterXSS from 'xss';

window.marked = marked;
window.filterXSS = filterXSS;
