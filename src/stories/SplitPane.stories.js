import SplitPane from '../components/SplitPane.svelte'

export default {
  title: 'SplitPane',
  component: SplitPane,
  argTypes: {
    split: {
      control: { type: 'select', options: ['horizontal', 'vertical'] },
    },
  },
}

const Template = ({ ...args }) => ({
  Component: SplitPane,
  props: args,
})

// {{{ Horizontal.
const horizontal = Template.bind({})
horizontal.args = {
  split: 'horizontal',
}
export { horizontal }
// }}}

// {{{ Vertical.
const vertical = Template.bind({})
vertical.args = {
  split: 'vertical',
}
export { vertical }
// }}}
