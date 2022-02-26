
const mdiFormCore = () => {
    const buildConf = (obj) => {
        const el = (str) => document.querySelector(str);
        const envEvents = {
            "mobile": {
                start: "touchstart",
                move: "touchmove",
                end: "touchend",
                out: "touchout"
            },
            "web": {
                start: "mousedown",
                move: "mousemove",
                end: "mouseup",
                out: "mouseout"
            }
        }
        if(!mdiFormCore.parent) mdiFormCore.parent = el("body");
        mdiFormCoreUtils.isMobile = !!navigator.userAgent.match(/mobile/i);
        mdiFormCoreUtils.touchAcceleration = obj.touchAcceleration || 1.5;
        mdiFormCoreUtils.throttle = obj.throttle || 10;
        mdiFormCoreZIndex.startFrom = obj.zIndexStartFrom || 9900;

        const pad = obj.resizePad || 0;
        const modal = el(obj.mdWrapper);
        const env = envEvents[mdiFormCoreUtils.isMobile?"mobile":"web"];
        return {
            modal,
            env,
            pad,
            mover: modal.querySelector(obj.moveWrapper)
        }
    }

    const setupStyles = (conf) => {
        const {modal,mover, pad} = conf;
        modal.style.padding = pad;
        modal.style.position = "absolute";
        mover.style.cursor = "move"
        mover.style.userSelect = "none"
    }
    const factory = {
        parent: (str) => {
            mdiFormCore.parent = document.querySelector(str)
            return factory;
        },
        create:(obj) => {
            setTimeout(() => { // await rendenization
                let processMoveEvent, processResizeEvent;
                const conf = buildConf(obj);
                setupStyles(conf);
                mdiFormCoreZIndex.register(conf)
                
                processMoveEvent = moverCoreConfigurator(conf);
                if(obj.resizable) processResizeEvent = resizeCoreConfiguration(conf)

                const processProxy = (e) => {
                    if(e.target !== conf.mover) return;
                    processMoveEvent(e);
                }
                conf.modal.addEventListener(conf.env.start, processProxy,false);
            },0)
        }
    }
    return factory;
}

const mdiFormCoreUtils = {
    isMobile: false,
    touchAcceleration: 1.5,
    toggleUserSelect: (bool) => {
        const value = bool? 'inherit': 'none';
        mdiFormCoreZIndex.forms.forEach(e => {
            e.dom.style.userSelect = value;
        })
    },
    getScreens: (e) => ({
        screenX: !mdiFormCoreUtils.isMobile? e.screenX : e.changedTouches[0].screenX * mdiFormCoreUtils.touchAcceleration, // web or mobile
        screenY: !mdiFormCoreUtils.isMobile? e.screenY : e.changedTouches[0].screenY * mdiFormCoreUtils.touchAcceleration // web or mobile
    }),
    getClients: (e) => ({
        clientX: !mdiFormCoreUtils.isMobile? e.clientX : e.changedTouches[0].clientX, // web or mobile
        clientY: !mdiFormCoreUtils.isMobile? e.clientY : e.changedTouches[0].clientY // web or mobile
    })
}
const mdiFormCoreZIndex = {
    startFrom: 0,
    forms:[],
    register:(conf)=> {
        const {modal:dom, env} = conf;
        const zIndex = mdiFormCoreZIndex.startFrom++;
        mdiFormCoreZIndex.forms.push({dom,zIndex});
        mdiFormCoreZIndex.renderZIndex();
        dom.addEventListener(env.start,mdiFormCoreZIndex.buildIndex,false)
    },
    getArrayIndex: (dom) => {
        let index = -1;
        const forms = mdiFormCoreZIndex.forms;
        for (let i=0; forms.length;i++) {
            const cursor = forms[i];
            if(cursor.dom !== dom) continue;
            index = i;
            break;
        }
        return index;
    },
    renderZIndex: () => {
        mdiFormCoreZIndex.forms.forEach((e,i) => {
            e.dom.style.zIndex = mdiFormCoreZIndex.startFrom+i;
        })
    },
    buildIndex: (e) => {
        const dom = e.currentTarget;
        const index = mdiFormCoreZIndex.getArrayIndex(dom);
        if(index === -1) return;
        const tmp = mdiFormCoreZIndex.forms.splice(index,1);
        mdiFormCoreZIndex.forms.push(tmp[0]);
        mdiFormCoreZIndex.renderZIndex();
    }
}

const resizeCoreConfiguration = (conf) => {
    let elms = {};
    let { pad, modal, mover, env } = conf;
    let {parent} = mdiFormCore;
    const {x:pX,y:pY,width:pW,height:pH} = parent.getBoundingClientRect();
    const initialModalBounds = modal.getBoundingClientRect();
    const {width:mW,height:mH} = initialModalBounds;
    
    const cancelHandlers = (handler) => {
        window.addEventListener(env.move, handler, false);
        window.addEventListener(env.end, (e) => {
            mdiFormCoreUtils.toggleUserSelect(true)
            window.removeEventListener(env.move, handler, false)
            window.removeEventListener(env.end, handler, false)
        }, false);
    }

    const topResizeHandler = (e) => {
        const {y:mY,height:mH} = modal.getBoundingClientRect();
        const handler = (e) => {
            mdiFormCoreUtils.toggleUserSelect(false)
            let {clientY} = mdiFormCoreUtils.getClients(e);
            const diff = mY - clientY;
            const nextHeight = diff + mH;
            const nextTop = mY - diff;
            if(nextTop < pY) return;
            modal.style.top = mY - diff;
            modal.style.height = nextHeight;
            elms['b'].style.top = elms['bl'].style.top = elms['br'].style.top = elms['l'].style.height = elms['r'].style.height = nextHeight + pad;
        }
        cancelHandlers(handler);
    }
    
    const rightResizeHandler = () => {
        const {x:mX} = modal.getBoundingClientRect();
        const handler = (e) => {
            mdiFormCoreUtils.toggleUserSelect(false)
            const {clientX} = mdiFormCoreUtils.getClients(e);
            const nextWidth = clientX - mX;
            if(mX + nextWidth + (pad * 2) > Math.abs(pX + pW)) return;
            modal.style.width = nextWidth;
            elms['r'].style.left = elms['br'].style.left = elms['tr'].style.left = elms['t'].style.width = elms['b'].style.width = nextWidth + pad;
        }
        cancelHandlers(handler);
    }

    const bottomResizeHandler = () => {
        const {y:mY} = modal.getBoundingClientRect();
        const handler = (e) => {
            mdiFormCoreUtils.toggleUserSelect(false)
            const {clientY} = mdiFormCoreUtils.getClients(e);
            const nextHeight = clientY - mY;
            if(mY + nextHeight + (pad / 2) > Math.abs(pY - pH)) return;
            modal.style.height = nextHeight;
            elms['b'].style.top = elms['bl'].style.top = elms['br'].style.top = elms['l'].style.height = elms['r'].style.height = nextHeight + pad;
        }
        cancelHandlers(handler);
    }
    const leftResizeHandler = (e) => {
        const {x:mX,width:mW} = modal.getBoundingClientRect();
        const handler = (e) => {
            mdiFormCoreUtils.toggleUserSelect(false)
            let {clientX} = mdiFormCoreUtils.getClients(e);
            const diff = clientX - mX;
            const nextWidth = mW - diff - pad;
            const nextLeft = mX + diff - pad;
            if(nextLeft < pX) return;
            modal.style.left = nextLeft;
            modal.style.width = nextWidth;
            elms['t'].style.width = elms['b'].style.width = elms['br'].style.left = elms['tr'].style.left = elms['r'].style.left = nextWidth + pad;
        }
        cancelHandlers(handler);
    }

    ['t','r','b','l','tl','tr','bl','br']
        .forEach((e,i) => {
            const elm = document.createElement("div");
            elm.style.display = "block";
            elm.style.position = "absolute";
            elm.dataset.resizeId=e;
            elms[e] = elm;

            let top = 0, left = 0, width = pad, height = pad; // top side
            elm.style.cursor = "nw-resize";
            
            switch(e) {
                case 'tl':{
                    elm.addEventListener(env.start,topResizeHandler,false)
                    elm.addEventListener(env.start,leftResizeHandler,false)
                } break;
                case 'tr': {
                    left = mW-pad; top = 0;
                    elm.style.cursor = "ne-resize";
                    elm.addEventListener(env.start,topResizeHandler,false)
                    elm.addEventListener(env.start,rightResizeHandler,false)
                } break;
                case 'br': {
                    left = mW-pad; top = mH-pad;
                    elm.style.cursor = "se-resize";
                    elm.addEventListener(env.start,rightResizeHandler,false)
                    elm.addEventListener(env.start,bottomResizeHandler,false)
                } break;
                case 'bl': {
                    left = 0; top = mH-pad;
                    elm.style.cursor = "sw-resize";
                    elm.addEventListener(env.start,leftResizeHandler,false)
                    elm.addEventListener(env.start,bottomResizeHandler,false)
                } break;
                case 't': {
                    width = mW;
                    elm.style.cursor = "n-resize"
                    elm.addEventListener(env.start,topResizeHandler,false)
                } break;
                case 'r': {
                    left = mW-pad; width=pad; height = mH;
                    elm.style.cursor = "e-resize"
                    elm.addEventListener(env.start,rightResizeHandler,false)
                } break;
                case 'b': {
                    left = 0; top = mH-pad; width = mW;
                    elm.style.cursor = "s-resize"
                    elm.addEventListener(env.start,bottomResizeHandler,false)
                } break;
                case 'l': {
                    width = pad; height = mH;
                    elm.style.cursor = "w-resize"
                    elm.addEventListener(env.start,leftResizeHandler,false)
                } break;
            }

            elm.style.top = top;
            elm.style.left = left;
            elm.style.width = width;
            elm.style.height = height;

            modal.insertBefore(elm,mover)
        });
}

const moverCoreConfigurator = (conf) => {
    let {modal,pad, env} = conf;

    let {parent} = mdiFormCore;
    let initialY, initialX, initialParentBounds, limitX, limitY, enableCaller = true;

    const dragStart = (e) => {
        isMoving = true;
        initialParentBounds = parent.getBoundingClientRect();
        const {x,y, width, height} = modal.getBoundingClientRect();
        const {screenX, screenY} = mdiFormCoreUtils.getScreens(e);

        initialY = screenY - y; // avoiding flicker
        initialX = screenX - x; // avoiding flicker
        
        limitX = initialParentBounds.width - width;
        limitY = initialParentBounds.height - height;
        
        window.addEventListener(env.move, onDrag,{passive: true});
        window.addEventListener(env.end, dragEnd,false); // get dragEnd outside bounds
    }

    const dragEnd = (e) => {
        window.removeEventListener(env.move, onDrag,{passive: true});
        window.removeEventListener(env.end, dragEnd,false); // releasing event from window
    }

    const onDrag = (e) => moveModal(e) // proxy

    const moveModal = (e) => {
        if(!enableCaller) return;
        enableCaller = false;
  
        const {x:pX,y:pY} = initialParentBounds;
        const {screenX, screenY} = mdiFormCoreUtils.getScreens(e);

        let nextY = (screenY - initialY);
        let nextX = (screenX - initialX);
        
        if(nextX < pX) nextX = pX; // left limit x 
        if(nextX - pad + 2 > limitX) nextX = limitX + pad - 2; // right limit x

        if(nextY < pY) nextY = pY; // top limit y
        if(nextY - pad + 2 > limitY) nextY = limitY + pad - 2; // bottom limit y

        modal.style.top = nextY;
        modal.style.left = nextX;

        setTimeout(() => enableCaller = true, mdiFormCoreUtils.throttle);
    }
    return dragStart;
}