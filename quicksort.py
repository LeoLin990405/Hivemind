"""
快速排序算法实现
"""


def quicksort(arr):
    """
    快速排序算法 - 使用额外空间实现（简洁版）
    
    Args:
        arr: 待排序的列表
    
    Returns:
        排序后的新列表
    """
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quicksort(left) + middle + quicksort(right)


def quicksort_inplace(arr, low=0, high=None):
    """
    快速排序算法 - 原地排序实现（高效版）
    
    Args:
        arr: 待排序的列表（会被原地修改）
        low: 起始索引
        high: 结束索引
    
    Returns:
        原地排序后的列表
    """
    if high is None:
        high = len(arr) - 1
    
    if low < high:
        # 分区并获取基准元素最终位置
        pivot_index = _partition(arr, low, high)
        
        # 递归排序左右两部分
        quicksort_inplace(arr, low, pivot_index - 1)
        quicksort_inplace(arr, pivot_index + 1, high)
    
    return arr


def _partition(arr, low, high):
    """
    分区操作：选择最后一个元素作为基准，
    将小于基准的放左边，大于基准的放右边
    
    Args:
        arr: 待分区的列表
        low: 起始索引
        high: 结束索引
    
    Returns:
        基准元素的最终索引
    """
    # 选择最右边元素作为基准
    pivot = arr[high]
    
    # i 指向小于基准区域的最后一个元素
    i = low - 1
    
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    
    # 将基准元素放到正确位置
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1


# ============ 测试代码 ============
if __name__ == "__main__":
    # 测试数据
    test_cases = [
        [64, 34, 25, 12, 22, 11, 90],
        [3, -1, 0, 5, -2],
        [5, 5, 5, 1],
        [1],
        [],
        [2, 1],
    ]
    
    print("=== 快速排序算法测试 ===\n")
    
    for i, test in enumerate(test_cases, 1):
        print(f"测试 {i}:")
        print(f"  原始数组: {test}")
        
        # 简洁版
        result1 = quicksort(test)
        print(f"  简洁版结果: {result1}")
        
        # 原地排序版
        test_copy = test.copy()
        result2 = quicksort_inplace(test_copy)
        print(f"  原地版结果: {result2}")
        print()
