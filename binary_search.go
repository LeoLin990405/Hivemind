package main

import "fmt"

// BinarySearch 在有序数组中查找目标值的索引
// 如果找到返回索引，否则返回 -1
// 时间复杂度: O(log n)
func BinarySearch(arr []int, target int) int {
	left, right := 0, len(arr)-1
	
	for left <= right {
		mid := left + (right-left)/2  // 防止溢出的写法
		
		if arr[mid] == target {
			return mid
		} else if arr[mid] < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}
	
	return -1
}

// BinarySearchFirst 查找第一个等于目标值的位置（处理重复元素）
func BinarySearchFirst(arr []int, target int) int {
	left, right := 0, len(arr)-1
	result := -1
	
	for left <= right {
		mid := left + (right-left)/2
		
		if arr[mid] == target {
			result = mid
			right = mid - 1  // 继续在左半部分查找
		} else if arr[mid] < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}
	
	return result
}

// BinarySearchLast 查找最后一个等于目标值的位置（处理重复元素）
func BinarySearchLast(arr []int, target int) int {
	left, right := 0, len(arr)-1
	result := -1
	
	for left <= right {
		mid := left + (right-left)/2
		
		if arr[mid] == target {
			result = mid
			left = mid + 1  // 继续在右半部分查找
		} else if arr[mid] < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}
	
	return result
}

// BinarySearchLowerBound 查找第一个大于等于目标值的位置
func BinarySearchLowerBound(arr []int, target int) int {
	left, right := 0, len(arr)
	
	for left < right {
		mid := left + (right-left)/2
		
		if arr[mid] < target {
			left = mid + 1
		} else {
			right = mid
		}
	}
	
	return left
}

// BinarySearchUpperBound 查找第一个大于目标值的位置
func BinarySearchUpperBound(arr []int, target int) int {
	left, right := 0, len(arr)
	
	for left < right {
		mid := left + (right-left)/2
		
		if arr[mid] <= target {
			left = mid + 1
		} else {
			right = mid
		}
	}
	
	return left
}

func main() {
	// 测试数据（必须是有序数组）
	arr := []int{1, 3, 5, 7, 9, 11, 13, 15, 17, 19}
	
	fmt.Println("数组:", arr)
	fmt.Println()
	
	// 测试基本二分查找
	target := 7
	idx := BinarySearch(arr, target)
	fmt.Printf("查找 %d: 索引 = %d\n", target, idx)
	
	target = 10
	idx = BinarySearch(arr, target)
	fmt.Printf("查找 %d: 索引 = %d (不存在)\n", target, idx)
	
	fmt.Println()
	
	// 测试有重复元素的数组
	arr2 := []int{1, 2, 4, 4, 4, 5, 6, 8, 8, 9}
	fmt.Println("数组(含重复):", arr2)
	
	target = 4
	fmt.Printf("查找 %d:\n", target)
	fmt.Printf("  任意位置: %d\n", BinarySearch(arr2, target))
	fmt.Printf("  第一个: %d\n", BinarySearchFirst(arr2, target))
	fmt.Printf("  最后一个: %d\n", BinarySearchLast(arr2, target))
	
	target = 8
	fmt.Printf("查找 %d:\n", target)
	fmt.Printf("  第一个: %d\n", BinarySearchFirst(arr2, target))
	fmt.Printf("  最后一个: %d\n", BinarySearchLast(arr2, target))
	
	fmt.Println()
	
	// 测试 LowerBound 和 UpperBound
	target = 4
	fmt.Printf("目标值 %d:\n", target)
	fmt.Printf("  LowerBound (第一个 >= %d): 索引 %d\n", target, BinarySearchLowerBound(arr2, target))
	fmt.Printf("  UpperBound (第一个 > %d): 索引 %d\n", target, BinarySearchUpperBound(arr2, target))
	fmt.Printf("  元素 %d 的个数: %d\n", target, BinarySearchUpperBound(arr2, target)-BinarySearchLowerBound(arr2, target))
}
