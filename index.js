var ul = vdom.el('ul', {id: 'list'},[
  vdom.el('h1', {style: 'color:red'}, ['Title']),
  vdom.el('li', {class: 'item'}, ['Item 1'], {key: 1}),
  vdom.el('li', {class: 'item'}, ['Item 2'], {key: 2}),
  vdom.el('li', {class: 'item'}, ['Item 3'], {key: 3})
])

var ul_new = vdom.el('ul', {id: 'list'},[
  vdom.el('h1', {style: 'color:blue'}, ['Title']),
  vdom.el('li', {class: 'super-item'}, ['Super-item'], {key: 4}),
  vdom.el('li', {class: 'item'}, ['Item 1'], {key: 1}),
  vdom.el('li', {class: 'item'}, ['Item 3'], {key: 3}),
  vdom.el('li', {class: 'item'}, ['Item 2'], {key: 2})
])

window.addEventListener('load', function(){
  var renderBtn = document.getElementById('render')
  var patchBtn = document.getElementById('patch')
  var clearBtn = document.getElementById('clear')
  
  renderBtn.addEventListener('click', function(){
    document.getElementById('container').appendChild(ul.render())
  })
  patchBtn.addEventListener('click', function(){
    var patches = ul.diff(ul_new)
    vdom.applyPatch(document.getElementsByTagName('ul')[0], patches)
  })
  clearBtn.addEventListener('click', function(){
    document.getElementById('container').innerHTML = ''
  })
})