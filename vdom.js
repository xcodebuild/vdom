"use strict"
var vdom = function(){
  function VElement(tagname, prop, children, option){
    this.tagname = tagname
    this.prop = prop
    this.children = children
    this.key = option && option.key
    var count = 0;
    children.forEach(function(child){
      if(child instanceof VElement){
        count += child.count
      }else if(typeof child === "string"){
        count += 1
      }
    })
    this.count = count;
  }

  function el(){
    // return new VElement(..arguments) in ES6
    return new
    (VElement.bind.apply
     (VElement, [null].concat(Array.prototype.slice.call(arguments))))
  }

  VElement.prototype.render = function(){
    var el = document.createElement(this.tagname)
    for(var propKey in this.prop){
      el.setAttribute(propKey, this.prop[propKey])
    }
    var children = this.children || []
   
    children.forEach(function(child){
      if(child instanceof VElement){
        el.appendChild(child.render())
      }else if(typeof child === "string"){
        el.appendChild(document.createTextNode(child))
      }
    })
    return el
  }

  function walkEl(oldEl, newEl, index, patches){
    var currentPatch = [];
    if(newEl === null){
      currentPatch.push({type: 'REMOVE'})
    }else if(oldEl.tagname !== newEl.tagname){
      // when newEl is TextNode newEl.tagname === undefined
      if(typeof newEl === 'string'){
        currentPatch.push({type: 'TEXT', new_val: newEl})
      }else{
        currentPatch.push({type: 'REPLACE', new_val: newEl})
      }
    }else if(typeof oldEl === 'string' && oldEl !== newEl){
      // newEl is TextNode,too, or oldEl.tagname !== newEl.tagname
      currentPatch.push({type: 'TEXT', new_val: newEl})
    }else if(JSON.stringify(oldEl.prop) != JSON.stringify(newEl.prop)){
      // diff props
      var oldProps = oldEl.prop || {}
      var newProps = newEl.prop || {}
      // find different
      for(var key in oldProps){
        if(newProps[key] !== oldProps[key]){
          currentPatch.push({type: 'PROPS', key: key, new_val: newProps[key]})
        }
      }

      // find new
      for(var key in newProps){
        if(!oldProps.hasOwnProperty(key)){
          currentPatch.push({type: 'PROPS', key: key, new_val: newProps[key]})
        }
      }
    }

    // diff children
    var childrenDiff = listDiff(oldEl.children, newEl.children)
    // reorder
    currentPatch.push({
      type: 'REORDER',
      diff: childrenDiff.diffs
    })
    // walk in
    var count = index
    oldEl.children&&oldEl.children.forEach(function(child){
      count += child.count
      var i = childrenDiff.need_walk_old.indexOf(child)
      if(i !== -1){
        // need walk in
        walkEl(childrenDiff.need_walk_old[i], childrenDiff.need_walk_new[i], count, patches)
      }
    })
    patches[index] = currentPatch
  }

  function listDiff(list1, list2){
    list1 = list1 || []
    list2 = list2 || []
    var dp = []
    var len1 = list1.length
    var len2 = list2.length
    if(len1 === 0) return len2
    if(len2 === 0) return len1
    
    for(var m = 0; m<=len1; m++){
      dp[m] = []
    }
    dp[0][0] = {
      last: null,
      count: 0,
      type: 'NOTHING',
      new_val: null,
      target: 0
    }
    for(var j = 1;j <= len2; j++){
      dp[0][j] = {
        last: dp[0][j-1],
        count: dp[0][j-1].count + 1,
        type: 'ADD',
        new_val: list2[j-1],
        target: j-1
      }
    }

    dp[0][0] = {
      last: null,
      count: 0,
      type: 'NOTHING',
      target: 0
    }
    for(var i = 1;i <= len1; i++){
      dp[i][0] = {
        last: dp[i-1][0],
        count: dp[i-1][0].count + 1,
        type: 'REMOVE',
        new_val: list2[i-1],
        target: i-1
      }
    }
    
    for(i = 1; i <= len1; i++){
        for(j = 1; j <= len2; j++){
            var add_dp = {
              last: dp[i][j-1],
              count: dp[i][j-1].count + 1,
              type: 'ADD',
              new_val: list2[j-1],
              target: j-1
            }
            var remove_dp = {
              last: dp[i-1][j],
              count: dp[i-1][j].count + 1,
              type: 'REMOVE',
              target: i-1
            }
            var is_equal = ((list1[i-1].key === list2[j-1].key) && list1[i-1].key && list2[i-1].key) ?true:false;
          
            var replace_dp = {
              last: dp[i-1][j-1],
              count: dp[i-1][j-1].count + (is_equal?0:1),
              type: is_equal?'NOTHING':'REPLACE',
              new_val: is_equal?null: list2[j-1].key,
              target: j-1,
              oldEl: list1[i-1],
              newEl: list2[j-1]
            }
            // get min
            dp[i][j] = [add_dp, remove_dp, replace_dp].sort(function(x,y){return x.count>y.count})[0]
        }
    }
    var diffs = []
    var cur = dp[len1][len2]

    while(cur){
      if(cur.type !== 'NOTHING'){ // NOTHING means no effect
        diffs = [cur].concat(diffs)
      }
      cur = cur.last
    }
    // adjust for REMOVE
    var need_walk_old = []
    var need_walk_new = []
    var diffs_adjust = []
    diffs.forEach(function(diff){
      if(diff.type === 'REMOVE'){
        diffs_adjust = [diff].concat(diffs_adjust)
      }else if(diff.type === 'REPLACE'){
        need_walk_old.push(diff.oldEl)
        need_walk_new.push(diff.newEl)
      }else{
        diffs_adjust.push(diff)
      }
    })
    return {
      diffs: diffs_adjust,
      need_walk_old: need_walk_old,
      need_walk_new: need_walk_new
    }
  }


  VElement.prototype.diff = function(newEl){
    var patches = []
    walkEl(this, newEl, 0, patches)
    return patches
  }

  function reorderChildren(dom, diffs){
    diffs.forEach(function(diff){
      switch(diff.type){
        case 'ADD':
          dom.insertBefore(diff.new_val.render(), dom.childNodes[diff.target])
          break
        case 'REMOVE':
          dom.removeChild(dom.childNodes[diff.target])
          break
        case 'REPLACE':
          dom.replaceChild(diff.new_val.render(), dom.childNodes[diff.target])
          break
      }
    })
  }

  function walkDom(dom, walker, patches){
    // save currentPatch
    var currentPatch = patches[walker.index]
    // walk children
    for(var i=0;i<dom.childNodes.length;i++){
      var childnode = dom.childNodes[i];
      walker.index ++
      walkDom(childnode, walker, patches)
    }
    
    if(currentPatch){ // have patche in current node

      currentPatch.forEach(function(patch){
        switch(patch.type){
          case 'REPLACE':
            dom.parentNode.replaceChild(patch.new_val.render(). dom)
            break
          case 'PROPS':
            
            dom.setAttribute(patch.key, patch.new_val)
            break
          case 'TEXT':
            dom.textContent = patch.new_val
            break
          case 'REORDER':
            reorderChildren(dom, patch.diff)
            break
        }
      })
    }

  }

  function applyPatch(dom, patches){
    var walker = {index: 0}
    walkDom(dom, walker, patches)
  }

  // export
  return {
    VElement: VElement,
    el: el,
    applyPatch: applyPatch
  }
}()

