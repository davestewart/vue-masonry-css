// the component name `<masonry />`
// can be overridden with `Vue.use(Masonry, { name: 'the-masonry' });`
const componentName = 'masonry';

const props = {
  tag: {
    type: [String],
    default: 'div'
  },
  cols: {
    type: [Object, Number, String],
    default: 2
  },
  gutter: {
    type: [Object, Number, String],
    default: 0
  },
  css: {
    type: [Boolean],
    default: true
  },
  columnTag: {
    type: [String],
    default: 'div'
  },
  columnClass: {
    type: [String, Array, Object],
    default: () => []
  },
  columnAttr: {
    type: [Object],
    default: () => ({})
  },
  fillGaps: {
    type: Boolean,
    default: false,
  }
};

// Get the resulting value from  `:col=` prop
// based on the window width
const breakpointValue = (mixed, windowWidth) => {
  const valueAsNum = parseInt(mixed);

  if (valueAsNum > -1) {
    return mixed;
  } else if (typeof mixed !== 'object') {
    return 0;
  }

  let matchedBreakpoint = Infinity;
  let matchedValue = mixed.default || 0;

  for (let k in mixed) {
    const breakpoint = parseInt(k);
    const breakpointValRaw = mixed[breakpoint];
    const breakpointVal = parseInt(breakpointValRaw);

    if (isNaN(breakpoint) || isNaN(breakpointVal)) {
      continue;
    }

    const isNewBreakpoint = windowWidth <= breakpoint && breakpoint < matchedBreakpoint;

    if (isNewBreakpoint) {
      matchedBreakpoint = breakpoint;
      matchedValue = breakpointValRaw;
    }
  }

  return matchedValue;
};

function getShortestColumnIndex (heights) {
  let trgIndex, trgHeight;
  for (let srcIndex = 0; srcIndex < heights.length; srcIndex++) {
    const srcHeight = heights[srcIndex];
    if (trgHeight === undefined || srcHeight < trgHeight) {
      trgHeight = srcHeight;
      trgIndex = srcIndex;
    }
  }
  return trgIndex;
}

const component = {
  props,

  data () {
    return {
      displayColumns: 2,
      displayGutter: 0
    };
  },

  mounted () {
    this.$nextTick(() => {
      this.reCalculate();
    });

    // Bind resize handler to page
    if (window) {
      window.addEventListener('resize', this.reCalculate);
    }
  },

  updated () {
    this.$nextTick(() => {
      this.reCalculate();
    });
  },

  beforeDestroy () {
    if (window) {
      window.removeEventListener('resize', this.reCalculate);
    }
  },

  methods: {
    // Recalculate how many columns to display based on window width
    // and the value of the passed `:cols=` prop
    reCalculate () {
      const previousWindowWidth = this.windowWidth;

      this.windowWidth = (window ? window.innerWidth : null) || Infinity;

      // Window resize events get triggered on page height
      // change which when loading the page can result in multiple
      // needless calculations. We prevent this here.
      if (previousWindowWidth === this.windowWidth) {
        return;
      }

      this._reCalculateColumnCount(this.windowWidth);

      this._reCalculateGutterSize(this.windowWidth);
    },

    _reCalculateGutterSize (windowWidth) {
      this.displayGutter = breakpointValue(this.gutter, windowWidth);
    },

    _reCalculateColumnCount (windowWidth) {
      let newColumns = breakpointValue(this.cols, windowWidth);

      // Make sure we can return a valid value
      newColumns = Math.max(1, Number(newColumns) || 0);

      this.displayColumns = newColumns;
    },

    _getChildItemsInColumnsArray () {
      let vnodes = this.$slots.default || [];

      // This component does not work with a child <transition-group /> ..yet,
      // so for now we think it may be helpful to ignore until we can find a way for support
      let vnode = vnodes[0];
      if (vnode && vnode.componentOptions && vnode.componentOptions.tag === 'transition-group') {
        vnodes = vnode.componentOptions.children;
      }

      // variables
      const columns = [];
      const heights = new Array(this.displayColumns).fill(0);

      // nodes
      vnodes = vnodes.filter(child => child.tag);
      vnodes.forEach((vnode, index) => {
        // get initial index
        let colIndex = index % this.displayColumns;

        // if we've an element, fill the shortest column instead
        if (this.fillGaps && vnode.elm) {
          colIndex = getShortestColumnIndex(heights);
          heights[colIndex] += vnode.elm.offsetHeight;
        }

        // create column if it doesn't exist
        if (!columns[colIndex]) {
          columns[colIndex] = [];
        }

        // add node
        columns[colIndex].push(vnode);
      });

      // return
      return columns;
    },
  },

  render (createElement) {
    const columnsContainingChildren = this._getChildItemsInColumnsArray();
    const isGutterSizeUnitless = parseInt(this.displayGutter) === this.displayGutter * 1;
    const gutterSizeWithUnit = isGutterSizeUnitless ? `${this.displayGutter}px` : this.displayGutter;

    const columnStyle = {
      boxSizing: 'border-box',
      backgroundClip: 'padding-box',
      width: `${100 / this.displayColumns}%`,
      border: '0 solid transparent',
      borderLeftWidth: gutterSizeWithUnit
    };

    const columns = columnsContainingChildren.map((children, index) => {
      /// Create column element and inject the children
      return createElement(this.columnTag, {
        key: index + '-' + columnsContainingChildren.length,
        style: this.css ? columnStyle : null,
        class: this.columnClass,
        attrs: this.columnAttr
      }, children); // specify child items here
    });

    const containerStyle = {
      display: ['-webkit-box', '-ms-flexbox', 'flex'],
      marginLeft: `-${gutterSizeWithUnit}`
    };

    // Return wrapper with columns
    return createElement(
      this.tag, // tag name
      this.css ? { style: containerStyle } : null, // element options
      columns // column vue elements
    );
  }
};

const Plugin = function () {};

Plugin.install = function (Vue, options = {}) {
  if (Plugin.installed) {
    return;
  }

  if (options.name) {
    Vue.component(options.name, component);
  } else {
    Vue.component(componentName, component);
  }
};

if (typeof window !== 'undefined' && window.Vue) {
  window.Vue.use(Plugin);
}

export default Plugin;
