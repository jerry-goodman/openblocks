import { message, Table } from "antd";
import { TableProps } from "antd/es/table";
import { TableCellContext, TableRowContext } from "comps/comps/tableComp/tableContext";
import { TableToolbar } from "comps/comps/tableComp/tableToolbarComp";
import { RowColorViewType } from "comps/comps/tableComp/tableTypes";
import {
  columnsToAntdFormat,
  COLUMN_CHILDREN_KEY,
  CustomColumnType,
  onTableChange,
  RecordType,
} from "comps/comps/tableComp/tableUtils";
import {
  defaultTheme,
  handleToHoverRow,
  handleToSelectedRow,
  TableStyleType,
} from "comps/controls/styleControlConstants";
import { CompNameContext, EditorContext } from "comps/editorState";
import { trans } from "i18n";
import _ from "lodash";
import { darkenColor, isDarkColor } from "openblocks-design";
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Resizable } from "react-resizable";
import styled, { css } from "styled-components";
import { useUserViewMode } from "util/hooks";
import { TableImplComp } from "./tableComp";

function genLinerGradient(color: string) {
  return `linear-gradient(${color}, ${color})`;
}

const getStyle = (style: TableStyleType) => {
  const background = genLinerGradient(style.background);
  const selectedRowBackground = genLinerGradient(style.selectedRowBackground);
  const hoverRowBackground = genLinerGradient(style.hoverRowBackground);
  const alternateBackground = genLinerGradient(style.alternateBackground);
  const isDark = isDarkColor(style.background);
  return css`
    border-color: ${style.border};
    border-radius: ${style.radius};

    .ant-table > .ant-table-container > .ant-table-content > table {
      thead tr th,
      tbody tr td {
        border-color: ${style.border};
      }

      .ant-table-thead > tr > th::before {
        background-color: ${style.border};
      }
    }

    .ant-table-thead {
      tr th {
        background-color: ${style.headerBackground};
        color: ${style.headerText};

        &.ant-table-column-has-sorters:hover {
          background-color: ${darkenColor(style.headerBackground, 0.05)};
        }

        .ant-table-column-sorter {
          color: ${style.headerText === defaultTheme.textDark ? "#bfbfbf" : style.headerText};
        }
      }
    }

    .ant-table-tbody {
      tr:nth-of-type(2n + 1) {
        &,
        td {
          background: ${background};
          color: ${style.cellText};
          // Column type view and edit color
          p, span.ant-badge-status-text, input {
            color: ${style.cellText};
          }
        }
      }

      tr:nth-of-type(2n) {
        &,
        td {
          background: ${alternateBackground};
          color: ${style.cellText};
          // Column type view and edit color
          p, span.ant-badge-status-text, input {
            color: ${style.cellText};
          }
        }
      }

      // selected row
      tr:nth-of-type(2n + 1).ant-table-row-selected {
        td {
          background: ${selectedRowBackground}, ${background};
        }

        td.ant-table-cell-row-hover,
        &:hover td {
          background: ${hoverRowBackground}, ${selectedRowBackground}, ${background};
        }
      }

      tr:nth-of-type(2n).ant-table-row-selected {
        td {
          background: ${selectedRowBackground}, ${alternateBackground};
        }

        td.ant-table-cell-row-hover,
        &:hover td {
          background: ${hoverRowBackground}, ${selectedRowBackground}, ${alternateBackground};
        }
      }

      // hover row
      > tr:nth-of-type(2n + 1) > td.ant-table-cell-row-hover {
        &,
        > div:nth-of-type(2) {
          background: ${hoverRowBackground}, ${background};
        }
      }

      > tr:nth-of-type(2n) > td.ant-table-cell-row-hover {
        &,
        > div:nth-of-type(2) {
          background: ${hoverRowBackground}, ${alternateBackground};
        }
      }

      // link color
      td a {
        color: ${isDark && "#A6FFFF"};

        &:hover {
          color: ${isDark && "#2EE6E6"};
        }
      }

      td div:has(a) {
        color: ${isDark && "#A6FFFF"};
      }
    }
  `;
};

const TableWrapper = styled.div<{
  $style: TableStyleType;
  toolbarPosition: "above" | "below" | "close";
}>`
  overflow: hidden;
  background: white;
  border: 1px solid #d7d9e0;

  .ant-table-wrapper {
    border-top: ${(props) => (props.toolbarPosition === "above" ? "1px solid" : "unset")};
    border-color: inherit;
  }

  .ant-table .ant-table-row-expand-icon {
    margin: 0;
    top: 18px;
    left: 4px;
  }

  .ant-table.ant-table-small .ant-table-row-expand-icon {
    top: 10px;
  }

  .ant-table.ant-table-middle .ant-table-row-expand-icon {
    top: 14px;
  }

  .ant-table {
    .ant-table-container {
      border-left: unset;

      .ant-table-content {
        table {
          border-top: unset;

          td {
            padding: 0px 0px;
          }

          thead > tr:first-child {
            th:last-child {
              border-right: unset;
            }
          }

          tbody > tr > td:last-child {
            border-right: unset;
          }

          .ant-empty-img-simple-g {
            fill: #fff;
          }

          > thead > tr:first-child {
            th:first-child {
              border-top-left-radius: 0px;
            }

            th:last-child {
              border-top-right-radius: 0px;
            }
          }

          // hide the bottom border of the last row
          ${(props) =>
            props.toolbarPosition !== "below" &&
            `
              tbody > tr:last-child > td {
                border-bottom: unset;
              }
          `}
        }

        .ant-table-expanded-row-fixed:after {
          border-right: unset !important;
        }
      }
    }
  }

  ${(props) => props.$style && getStyle(props.$style)}
`;

const TableTh = styled.th<{ width?: number }>`
  > div {
    overflow: hidden;
    white-space: pre;
    text-overflow: ellipsis;
  }

  ${(props) => props.width && `width: ${props.width}px`};
`;

const TableTd = styled.td<{ background: string; $isEditing: boolean }>`
  .ant-table-row-expand-icon,
  .ant-table-row-indent {
    display: ${(props) => (props.$isEditing ? "none" : "initial")};
  }

  ${(props) =>
    props.background &&
    `
      background: ${props.background} !important;
   `};
`;

const MinColumnWidth = 55;

const ResizeableTitle = (props: any) => {
  const { onResize, onResizeStop, width, viewModeResizable, ...restProps } = props;
  const [widthChild, setWidthChild] = useState(0);
  const elementRef = useRef(null);
  const isUserViewMode = useUserViewMode();

  const setChildWidth = () => {
    if (width && width > 0) {
      // There is width, no need for childWidth
      return;
    }
    setWidthChild((elementRef.current as any).getBoundingClientRect().width);
  };

  useEffect(() => {
    if (!elementRef.current) {
      return;
    }
    setChildWidth();
  }, []);

  if (isUserViewMode && !viewModeResizable) {
    return <TableTh ref={elementRef} {...restProps} width={width} />;
  }

  return (
    <Resizable
      width={width > 0 ? width : widthChild}
      height={0}
      onResize={(e: React.SyntheticEvent, { size }: { size: { width: number } }) =>
        onResize(size.width)
      }
      onResizeStart={(e) => {
        setChildWidth();
        e.stopPropagation();
        e.preventDefault();
      }}
      onResizeStop={onResizeStop}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <TableTh ref={elementRef} {...restProps} />
    </Resizable>
  );
};

type CustomTableProps<RecordType> = Omit<TableProps<RecordType>, "components" | "columns"> & {
  columns: CustomColumnType<RecordType>[];
  viewModeResizable: boolean;
  rowColor: RowColorViewType;
};

function TableCellView(props: {
  record: any;
  title: string;
  rowColor: RowColorViewType;
  rowIndex: number;
  children: any;
}) {
  const { record, title, rowIndex, rowColor, children, ...restProps } = props;
  const [editing, setEditing] = useState(false);
  const rowContext = useContext(TableRowContext);
  let tdView;
  if (!record) {
    tdView = <td {...restProps}>{children}</td>;
  } else {
    const color = rowColor({
      currentRow: record.record,
      currentIndex: rowIndex,
      currentOriginalIndex: record.index,
      columnTitle: title,
    });
    let background = "";
    if (color) {
      background = genLinerGradient(color);
    }
    if (color && rowContext.selected) {
      background = genLinerGradient(handleToSelectedRow(color)) + "," + background;
    }
    if (color && rowContext.hover) {
      background = genLinerGradient(handleToHoverRow(color)) + "," + background;
    }
    tdView = (
      <TableTd {...restProps} background={background} $isEditing={editing}>
        {children}
      </TableTd>
    );
  }

  return (
    <TableCellContext.Provider value={{ isEditing: editing, setIsEditing: setEditing }}>
      {tdView}
    </TableCellContext.Provider>
  );
}

function TableRowView(props: any) {
  const [hover, setHover] = useState(false);
  const [selected, setSelected] = useState(false);
  return (
    <TableRowContext.Provider value={{ hover: hover, selected: selected }}>
      <tr
        {...props}
        tabIndex={-1}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setSelected(true)}
        onBlur={() => setSelected(false)}
      ></tr>
    </TableRowContext.Provider>
  );
}

/**
 * A table with adjustable column width, width less than 0 means auto column width
 */
function ResizeableTable<RecordType extends object>(props: CustomTableProps<RecordType>) {
  const [resizeData, setResizeData] = useState({
    index: -1,
    width: -1,
  });
  const columns = props.columns.map((col, index) => {
    const { width, ...restCol } = col;
    const resizeWidth = (resizeData.index === index ? resizeData.width : col.width) ?? 0;
    return {
      ...restCol,
      RC_TABLE_INTERNAL_COL_DEFINE: {
        style: {
          minWidth: resizeWidth > 0 ? "unset" : MinColumnWidth,
          width: resizeWidth > 0 ? resizeWidth : "auto",
        },
      },
      onCell: (record: RecordType, rowIndex: any) => ({
        record,
        title: col.titleText,
        rowColor: props.rowColor,
        rowIndex: rowIndex,
      }),
      onHeaderCell: () => ({
        width: resizeWidth,
        title: col.titleText,
        viewModeResizable: props.viewModeResizable,
        onResize: (width: number) => {
          if (width) {
            setResizeData({
              index: index,
              width: width,
            });
          }
        },
        onResizeStop: (e: React.SyntheticEvent, { size }: { size: { width: number } }) => {
          setResizeData({
            index: -1,
            width: -1,
          });
          if (col.onWidthResize) {
            col.onWidthResize(size.width);
          }
        },
      }),
    };
  });

  return (
    <Table<RecordType>
      components={{
        header: {
          cell: ResizeableTitle,
        },
        body: {
          cell: TableCellView,
          row: TableRowView,
        },
      }}
      {...props}
      pagination={false}
      columns={columns}
      scroll={{ x: MinColumnWidth * columns.length }}
    ></Table>
  );
}

ResizeableTable.whyDidYouRender = true;

export function TableCompView(props: {
  comp: InstanceType<typeof TableImplComp>;
  onRefresh: (allQueryNames: Array<string>, setLoading: (loading: boolean) => void) => void;
  onDownload: (fileName: string) => void;
}) {
  const editorState = useContext(EditorContext);
  const viewMode = useUserViewMode();
  const compName = useContext(CompNameContext);
  const [loading, setLoading] = useState(false);
  const { comp, onDownload, onRefresh } = props;
  const compChildren = comp.children;
  const style = compChildren.style.getView();
  const changeSet = useMemo(() => compChildren.columns.getChangeSet(), [compChildren.columns]);
  const hasChange = useMemo(() => !_.isEmpty(changeSet), [changeSet]);
  const columns = useMemo(() => compChildren.columns.getView(), [compChildren.columns]);
  const columnViews = useMemo(() => columns.map((c) => c.getView()), [columns]);
  const data = comp.filterData;
  const sort = useMemo(() => compChildren.sort.getView(), [compChildren.sort]);
  const toolbar = useMemo(() => compChildren.toolbar.getView(), [compChildren.toolbar]);
  const pagination = useMemo(() => compChildren.pagination.getView(), [compChildren.pagination]);
  const size = useMemo(() => compChildren.size.getView(), [compChildren.size]);
  const onEvent = useMemo(() => compChildren.onEvent.getView(), [compChildren.onEvent]);
  const dynamicColumn = compChildren.dynamicColumn.getView();
  const dynamicColumnConfig = useMemo(
    () => compChildren.dynamicColumnConfig.getView(),
    [compChildren.dynamicColumnConfig]
  );
  const columnsAggrData = comp.columnAggrData;
  const antdColumns = useMemo(
    () =>
      columnsToAntdFormat(
        columnViews,
        sort,
        toolbar.columnSetting,
        size,
        dynamicColumn,
        dynamicColumnConfig,
        columnsAggrData
      ),
    [
      columnViews,
      sort,
      toolbar.columnSetting,
      size,
      dynamicColumn,
      dynamicColumnConfig,
      columnsAggrData,
    ]
  );

  const pageDataInfo = useMemo(() => {
    // Data pagination
    let pagedData = data;
    let current = pagination.current;
    const total = pagination.total || data.length;
    if (data.length > pagination.pageSize) {
      // Local pagination
      let offset = (current - 1) * pagination.pageSize;
      if (offset >= total) {
        current = 1;
        offset = 0;
      }
      pagedData = pagedData.slice(offset, offset + pagination.pageSize);
    }
    return {
      total: total,
      current: current,
      data: pagedData,
    };
  }, [pagination, data]);

  const handleChangeEvent = useCallback(
    (eventName) => {
      if (eventName === "saveChanges" && !compChildren.onEvent.isBind(eventName)) {
        !viewMode && message.warn(trans("table.saveChangesNotBind"));
        return;
      }
      compChildren.onEvent.getView()(eventName);
      setTimeout(() => compChildren.columns.dispatchClearChangeSet());
    },
    [viewMode, compChildren.onEvent, compChildren.columns]
  );

  const toolbarView = (
    <TableToolbar
      toolbar={toolbar}
      $style={style}
      pagination={{
        ...pagination,
        total: pageDataInfo.total,
        current: pageDataInfo.current,
      }}
      columns={columns}
      onRefresh={() =>
        onRefresh(
          editorState.queryCompInfoList().map((info) => info.name),
          setLoading
        )
      }
      onDownload={() => onDownload(`${compName}-data`)}
      hasChange={hasChange}
      onSaveChanges={() => handleChangeEvent("saveChanges")}
      onCancelChanges={() => handleChangeEvent("cancelChanges")}
      onEvent={onEvent}
    />
  );

  return (
    <TableWrapper $style={style} toolbarPosition={toolbar.position}>
      {toolbar.position === "above" && toolbarView}
      <ResizeableTable<RecordType>
        expandable={{ childrenColumnName: COLUMN_CHILDREN_KEY }}
        rowColor={compChildren.rowColor.getView() as any}
        {...compChildren.selection.getView()(onEvent)}
        bordered={!compChildren.hideBordered.getView()}
        onChange={(pagination, filters, sorter, extra) => {
          onTableChange(pagination, filters, sorter, extra, comp.dispatch, onEvent);
        }}
        showHeader={!compChildren.hideHeader.getView()}
        columns={antdColumns}
        viewModeResizable={compChildren.viewModeResizable.getView()}
        dataSource={pageDataInfo.data}
        size={compChildren.size.getView()}
        tableLayout="fixed"
        loading={
          loading ||
          // fixme isLoading type
          (compChildren.showDataLoadSpinner.getView() && (compChildren.data as any).isLoading()) ||
          compChildren.loading.getView()
        }
      />
      {toolbar.position === "below" && toolbarView}
    </TableWrapper>
  );
}
